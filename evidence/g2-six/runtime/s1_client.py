import copy
import json
import math
import os
import pathlib
import re
import urllib.error
import urllib.parse
import urllib.request
import uuid


ROOT = pathlib.Path(__file__).resolve().parent
MAX_RESPONSE = 32 * 1024 * 1024


class ComfyError(Exception):
    pass


class SubmissionUnknown(ComfyError):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, handle, code, message, headers, new_url):
        return None


class ComfyClient:
    def __init__(self, base_url="", token="", timeout=25):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.timeout = timeout
        if self.base_url:
            parsed = urllib.parse.urlsplit(self.base_url)
            if parsed.username or parsed.password or parsed.query or parsed.fragment:
                raise ValueError("Comfy地址不能包含凭据、查询参数或片段")
            if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost", "::1")):
                raise ValueError("远程Comfy地址必须使用HTTPS；HTTP仅允许本机SSH隧道")
        self.opener = urllib.request.build_opener(NoRedirect())

    @classmethod
    def from_environment(cls):
        return cls(os.environ.get("THESIS_COMFY_URL", ""), os.environ.get("THESIS_COMFY_TOKEN", ""))

    def request(self, route, payload=None, raw=False, content_type="application/json", ambiguous=False):
        if not self.base_url:
            raise ComfyError("尚未配置云端ComfyUI地址")
        body = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": content_type, "Accept": "*/*" if raw else "application/json"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        request = urllib.request.Request(self.base_url + route, data=body, headers=headers)
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                result = response.read(MAX_RESPONSE + 1)
                if len(result) > MAX_RESPONSE:
                    if ambiguous:
                        raise SubmissionUnknown("提交响应超出32MiB，入队状态未知；禁止自动补提")
                    raise ComfyError("云端响应超出32MiB上限")
                if raw:
                    return result
                try:
                    decoded = json.loads(result)
                except (ValueError, UnicodeDecodeError) as error:
                    if ambiguous:
                        raise SubmissionUnknown("提交响应不可解读，入队状态未知；禁止自动补提") from error
                    raise ComfyError("云端返回的不是JSON；请检查隧道或登录网关") from error
                if not isinstance(decoded, dict):
                    if ambiguous:
                        raise SubmissionUnknown("提交响应不是对象，入队状态未知；禁止自动补提")
                    raise ComfyError("云端JSON结构不是对象；请检查网关，不自动重试")
                return decoded
        except urllib.error.HTTPError as error:
            if ambiguous and error.code >= 500:
                raise SubmissionUnknown(f"提交返回HTTP {error.code}，入队状态未知；禁止自动补提") from error
            raise ComfyError(f"云端HTTP {error.code}；未自动重试") from error
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as error:
            if ambiguous:
                raise SubmissionUnknown("提交回执未知：可能已入队，禁止自动重试；请先核队列/历史") from error
            raise ComfyError("云端连接失败；未自动重试或修改认证") from error

    def preflight(self, graph):
        schemas = self.request("/object_info")
        if not isinstance(schemas, dict):
            raise ComfyError("节点信息响应异常")
        missing = sorted({node["class_type"] for node in graph.values()} - set(schemas))
        missing_weights = []
        missing_reference = False
        for node in graph.values():
            required = schemas.get(node["class_type"], {}).get("input", {}).get("required", {})
            for field in ("unet_name", "clip_name", "vae_name", "name"):
                if field in node["inputs"] and field in required:
                    choices = required[field][0]
                    if isinstance(choices, list) and node["inputs"][field] not in choices:
                        missing_weights.append(node["inputs"][field])
        if "images.image_1" in graph["4"]["inputs"]:
            definition = schemas.get("TextEncodeQwenImage21", {}).get("input", {})
            image_schema = definition.get("required", {}).get("images", [])
            missing_reference = (not image_schema or image_schema[0] != "COMFY_AUTOGROW_V3" or
                                 "image_1" not in image_schema[1].get("template", {}).get("names", []) or
                                 "vae" not in definition.get("optional", {}))
        return {"ok": not missing and not missing_weights and not missing_reference, "missing_nodes": missing,
                "missing_weights": missing_weights, "checked": "node_classes_and_declared_weight_names",
                "missing_reference_capability": missing_reference,
                "model_execution_verified": False}

    def upload(self, image, filename):
        if not re.fullmatch(r"[a-zA-Z0-9_-]+\.(png|jpg|webp)", filename):
            raise ComfyError("不合法的输入文件名")
        boundary = "workbench-" + uuid.uuid4().hex
        mime = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}[filename.rsplit(".", 1)[1]]
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{filename}\"\r\n"
                f"Content-Type: {mime}\r\n\r\n").encode() + image
        body += f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\nfalse\r\n--{boundary}--\r\n".encode()
        result = self.request("/upload/image", body, content_type="multipart/form-data; boundary=" + boundary)
        name = result.get("name")
        subfolder = result.get("subfolder", "")
        if not isinstance(name, str) or not name or any(piece in name for piece in ("/", "\\", "..")):
            raise ComfyError("上传回执中的文件名不合法")
        if not isinstance(subfolder, str) or subfolder.startswith(("/", "\\")) or ".." in subfolder.split("/"):
            raise ComfyError("上传回执中的目录不合法")
        return subfolder.rstrip("/") + "/" + name if subfolder else name

    def check_runtime(self):
        stats = self.request("/system_stats")
        if not isinstance(stats.get("devices"), list) or not stats["devices"]:
            raise ComfyError("云端未声明执行设备；不能把API连通当成可推理")
        devices = stats["devices"]
        if any(not isinstance(device, dict) or not isinstance(device.get("type"), str) for device in devices):
            raise ComfyError("云端设备信息不可判读；未上传或提交")
        ready = any(device["type"] == "cuda" and type(device.get("vram_total")) in (int, float)
                    and math.isfinite(device["vram_total"]) and device["vram_total"] > 0 for device in devices)
        return {"ready": ready, "device_types": sorted({device["type"] for device in devices}),
                "checked": "declared_cuda_device_only_not_model_capacity_or_inference",
                "model_execution_verified": False,
                "reason": "已声明CUDA设备，仍须真实模型验证" if ready else "当前仅CPU或非CUDA服务，不提交Qwen生成"}

    def submit(self, graph, client_id):
        result = self.request("/prompt", {"prompt": graph, "client_id": client_id}, ambiguous=True)
        if not isinstance(result, dict):
            raise SubmissionUnknown("提交响应不是对象，入队状态未知；禁止自动补提")
        prompt_id = result.get("prompt_id")
        if result.get("error") or result.get("node_errors"):
            raise ComfyError("云端节点校验失败，未自动重试")
        if not isinstance(prompt_id, str) or not re.fullmatch(r"[a-zA-Z0-9_-]+", prompt_id):
            raise SubmissionUnknown("云端未返回有效prompt_id；不能确定是否入队，禁止自动补提")
        return prompt_id

    def reconcile(self, client_id):
        queue = self.request("/queue")
        history = self.request("/history?max_items=100")
        candidates = queue.get("queue_running", []) + queue.get("queue_pending", [])
        candidates += [record.get("prompt") for record in history.values() if isinstance(record, dict)]
        identifiers = set()
        for candidate in candidates:
            if isinstance(candidate, list) and len(candidate) >= 4 and isinstance(candidate[3], dict):
                if candidate[3].get("client_id") == client_id:
                    identifier = candidate[1]
                    if isinstance(identifier, str) and re.fullmatch(r"[a-zA-Z0-9_-]+", identifier):
                        identifiers.add(identifier)
        if len(identifiers) == 1:
            return next(iter(identifiers))
        return None

    def history(self, prompt_id):
        result = self.request("/history/" + urllib.parse.quote(prompt_id, safe=""))
        record = result.get(prompt_id)
        if not record:
            return {"status": "pending"}
        status = record.get("status", {})
        if status.get("status_str") == "error":
            return {"status": "failed", "error": "ComfyUI工作流执行失败，未自动重试"}
        images = record.get("outputs", {}).get("12", {}).get("images", [])
        if not images:
            return {"status": "pending", "note": "尚无设计输出，Canny预处理图不当结果"}
        if not status.get("completed") or status.get("status_str") != "success":
            return {"status": "pending"}
        metadata = images[0]
        if metadata.get("type") != "output":
            raise ComfyError("结果不是output类型设计图")
        query = urllib.parse.urlencode({key: metadata.get(key, "") for key in ("filename", "subfolder", "type")})
        return {"status": "completed", "image": self.request("/view?" + query, raw=True),
                "remote_output": metadata}


def workflow(spec, prompt, condition="C1", uploaded="control.png", prefix="workbench", reference=None):
    if condition not in ("C0", "C1"):
        raise ValueError("C2自适应协调尚未验证；当前只提供直接/参数条件流程")
    graph = copy.deepcopy(json.loads((ROOT / "workflows/qwen21-control.json").read_text(encoding="utf-8"))["prompt"])
    graph["4"]["inputs"]["prompt"] = prompt
    graph["10"]["inputs"]["seed"] = spec["seed"]
    graph["10"]["inputs"]["steps"] = spec["steps"]
    graph["12"]["inputs"]["filename_prefix"] = prefix
    if condition == "C0":
        graph["10"]["inputs"]["model"] = ["1", 0]
        for identifier in ("5", "6", "7", "8", "9"):
            graph.pop(identifier)
    else:
        graph["5"]["inputs"]["image"] = uploaded
        graph["9"]["inputs"]["strength"] = spec["control_strength"]
    if reference:
        graph["15"] = {"class_type": "LoadImage", "inputs": {"image": reference}}
        graph["4"]["inputs"]["images.image_1"] = ["15", 0]
        graph["4"]["inputs"]["vae"] = ["3", 0]
    return graph
