"""Optional Chinese semantic ranker. The public library also works without ML dependencies."""

import hashlib
import json
import os
import tempfile
import urllib.request
from pathlib import Path

MODEL_ID = "BAAI/bge-small-zh-v1.5"
REVISION = "8399f11f8da998fe932df2684586c92024219d05"
FILES = {
    "config.json": "3853a7979202c348751b753e36f579c41d8da7d36af617d3d907e1fc9b441f2a",
    "model.safetensors": "354763b9b1357bc9c44f62c6be2276321081ed2567773608c0d0785b61d5a026",
    "tokenizer.json": "48cea5d44424912a6fd1ea647bf4fe50b55ab8b1e5879c3275f80e339e8fae26",
    "tokenizer_config.json": "e6f3b96db926a37d4039995fbf5ad17de158dfb8f6343d607e4dbaad18d75f5a",
    "special_tokens_map.json": "b6d346be366a7d1d48332dbc9fdf3bf8960b5d879522b7799ddba59e76237ee3",
    "vocab.txt": "45bbac6b341c319adc98a532532882e91a9cefc0329aa57bac9ae761c27b291c",
}
HOME = Path(__file__).resolve().parent / ".cache" / "bge-small-zh-v1.5"


def file_digest(path):
    sha = hashlib.sha256()
    with path.open("rb") as src:
        for block in iter(lambda: src.read(1024 * 1024), b""):
            sha.update(block)
    return sha.hexdigest()


def checked_files(folder, files, model_id, revision, fetch=False):
    for name, expected in files.items():
        path = folder / name
        if path.exists() and file_digest(path) == expected:
            continue
        if not fetch:
            raise ValueError(
                f"缺少匹配 {model_id} 固定版本的模型文件 {name}。请按 README 获取权重。"
            )
        folder.mkdir(parents=True, exist_ok=True)
        url = f"https://modelscope.cn/models/{model_id}/resolve/{revision}/{name}"
        with tempfile.NamedTemporaryFile(dir=folder, delete=False) as tmp:
            new = Path(tmp.name)
        try:
            digest = hashlib.sha256()
            with (
                urllib.request.urlopen(url, timeout=90) as response,
                new.open("wb") as out,
            ):
                for block in iter(lambda: response.read(1024 * 1024), b""):
                    out.write(block)
                    digest.update(block)
            if digest.hexdigest() != expected:
                raise ValueError(f"模型文件摘要不符: {name}")
            os.replace(new, path)
        finally:
            new.unlink(missing_ok=True)
    return folder


def model_files(fetch=False):
    return checked_files(HOME, FILES, MODEL_ID, REVISION, fetch)


class Encoder:
    def __init__(self):
        from transformers import AutoModel, AutoTokenizer
        import torch

        path = model_files()
        torch.set_num_threads(min(4, os.cpu_count() or 1))
        self.torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(path, local_files_only=True)
        self.model = AutoModel.from_pretrained(
            path, local_files_only=True, use_safetensors=True
        ).eval()

    def encode(self, texts, query=False):
        vectors = []
        for offset in range(0, len(texts), 24):
            batch = texts[offset : offset + 24]
            if query:
                batch = [
                    "为这个句子生成表示以用于检索相关文章：" + text for text in batch
                ]
            tokens = self.tokenizer(
                batch,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt",
            )
            with self.torch.inference_mode():
                cls = self.model(**tokens).last_hidden_state[:, 0, :]
                normed = self.torch.nn.functional.normalize(cls, dim=1)
            vectors.extend(normed.cpu().numpy().astype("<f4"))
        return vectors


if __name__ == "__main__":
    model_files(fetch=True)
    print(
        json.dumps(
            {"model": MODEL_ID, "revision": REVISION, "verified_files": len(FILES)}
        )
    )
