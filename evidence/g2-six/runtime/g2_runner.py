import argparse
import datetime as dt
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
import uuid
import zipfile

from s1_client import ComfyClient


BASE = Path(__file__).resolve().parent
INSTANCE = 'cpod-1xeowetirag0'
PYTHON = '/workspace/expression4-20261107-once/venv/bin/python'
SOURCE = Path('/workspace/expression4-20261107-once/ComfyUI-e8665ca8e4089ab917567cdb491308e1397663d4')
REMOTE = Path('/workspace/g2-six-20261109-once')
GPU = 'NVIDIA GeForce RTX 4090'


class ProtectedStop(BaseException):
    pass


def require(condition, message):
    if not condition:
        raise ValueError(message)


def now():
    return dt.datetime.now(dt.timezone.utc)


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def persist(path, value):
    temporary = Path(str(path) + '.partial')
    with temporary.open('w', encoding='utf-8', newline='\n') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write('\n')
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


def digest(path):
    checksum = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            checksum.update(chunk)
    return checksum.hexdigest()


def safe_file(root, name):
    root = Path(root).resolve()
    path = root / name
    require(not path.is_symlink() and path.is_file() and path.resolve().is_relative_to(root), 'Unsafe or missing file: ' + name)
    return path


def validate_package(base):
    manifest = load(base / 'manifest.json')
    for name, expected in manifest.items():
        path = safe_file(base, name)
        require(path.stat().st_size == expected['bytes'] and digest(path) == expected['sha256'], 'Frozen file mismatch: ' + name)
    protocol = load(base / 'protocol.json')
    require(protocol['maximum_submissions'] == 6 and protocol['automatic_retries'] == 0, 'Wrong scope')
    expected = load(base / 'design-manifest.json')
    require(expected['batch']=='G2' and [c['case_id'] for c in protocol['cases']]==[c['case'] for c in expected['cases']], 'Wrong frozen cases')
    for name, sha in expected['files'].items():
        require(digest(safe_file(base,Path(name).name))==sha,'Unmatched design bytes')
    return protocol


def binding_guard(binding, manifest_sha, current):
    require(binding['instance_id'] == INSTANCE and binding['manifest_sha256'] == manifest_sha, 'Wrong instance or package binding')
    observed = dt.datetime.fromisoformat(binding['observed_at_utc'])
    paid_start = dt.datetime.fromisoformat(binding['paid_start_bound_utc'])
    shutdown = dt.datetime.fromisoformat(binding['shutdown_utc'])
    require(all(value.tzinfo is not None for value in [observed, paid_start, shutdown, current]), 'Timezone required')
    require(0 <= (current - observed).total_seconds() <= 300 and paid_start <= observed, 'Stale or future binding')
    require(binding['other_GPU_running'] == 0 and binding['shutdown_independently_reloaded'] is True, 'Isolation or shutdown not verified')
    require(binding['prior_submissions_this_batch']==0, 'Run already started')
    duration=(shutdown-paid_start).total_seconds()
    require(0 < duration <= 6120 and shutdown>current, '102-minute paid window exceeded')
    price=binding['price_CNY_per_hour']
    balance=binding['balance_CNY']
    other=binding['other_categories_upper_CNY']
    values=[price,balance,other]
    require(all(type(v) in (float,int) and math.isfinite(v) and v>=0 for v in values) and price>0,'Invalid quote')
    require(isinstance(binding['other_categories_basis'],str) and binding['other_categories_basis'].strip(),'Missing cost basis')
    # Explicit billing-rounding upper bound is included under other categories.
    future_reserve=math.ceil(price*duration/3600*100)/100 + other + 1.0
    require(future_reserve<=6 and future_reserve<=balance,'Quote exceeds 6 yuan or available balance')
    deadline = shutdown - dt.timedelta(seconds=180)
    preparation_budget(deadline, current)
    return deadline, {'future_compute_and_allowances_CNY': future_reserve, 'other_category_allowance_CNY': other, 'buffer_CNY': 1, 'all_category_final_cost_unknown': True}


def preparation_budget(deadline, current):
    seconds = min(900, (deadline - current).total_seconds() - 6 * 720)
    require(seconds >= 60, 'Insufficient preparation time while reserving six full case bounds')
    return seconds


def arm(deadline, maximum_seconds):
    remaining = min(maximum_seconds, (deadline - now()).total_seconds())
    require(remaining > 0, 'Protected deadline exhausted')
    signal.setitimer(signal.ITIMER_REAL, remaining)


def verify_source_tree():
    archive_path = Path('/workspace') / (SOURCE.name + '.zip')
    require(digest(archive_path) == '9277cf32e608a2fa72367e01a9f560070ca4050274a7df82aa447df9295159d0', 'Original source archive changed')
    checked = 0
    with zipfile.ZipFile(archive_path) as archive:
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            parts = Path(entry.filename).parts
            require(parts[0] == SOURCE.name and '..' not in parts, 'Unsafe source archive')
            path = safe_file(SOURCE, Path(*parts[1:]).as_posix())
            require(digest(path) == hashlib.sha256(archive.read(entry)).hexdigest(), 'Source tree mismatch: ' + entry.filename)
            checked += 1
    return {'files_verified': checked, 'original_backend_unchanged': True}


def preflight(base, runtime):
    expected = load(base / 'assets.json')
    require(sys.platform == 'linux' and socket.gethostname() == INSTANCE and sys.executable == PYTHON, 'Wrong Linux instance or venv')
    require(SOURCE.resolve() == SOURCE and not SOURCE.is_symlink(), 'Redirected source')
    actual = {name: importlib.metadata.version(name) for name in expected['packages']}
    require(actual == expected['packages'], 'Dependency changed; no installation or upgrade allowed')
    persist(runtime / 'environment.json', {'python': sys.executable, 'packages': actual, 'source_path': str(SOURCE), 'installations': 0})
    import torch
    require(torch.__version__ == '2.8.0+cu128' and torch.version.cuda == '12.8' and torch.cuda.device_count() == 1, 'Wrong Torch/CUDA/device count')
    require(torch.cuda.get_device_name(0) == GPU and torch.cuda.get_device_properties(0).total_memory >= 24_000_000_000, 'Wrong allocated GPU')
    persist(runtime / 'hardware.json', {'hostname': socket.gethostname(), 'torch': str(torch.__version__), 'cuda': torch.version.cuda, 'gpu': GPU, 'vram_bytes': torch.cuda.get_device_properties(0).total_memory})
    persist(runtime / 'source-tree.json', verify_source_tree())
    verified = []
    persist(runtime / 'weight-hashes.json', verified)
    for entry in expected['weights']:
        path = safe_file(SOURCE / 'models', entry['path'])
        require(path.stat().st_size == entry['bytes'] and digest(path) == entry['sha256'], 'Original BF16 weight mismatch: ' + entry['path'])
        verified.append(entry)
        persist(runtime / 'weight-hashes.json', verified)
def stop_owned(server):
    if server is None or server.poll() is not None:
        return
    try:
        os.killpg(server.pid, signal.SIGTERM)
        server.wait(timeout=10)
    except ProcessLookupError:
        pass
    except subprocess.TimeoutExpired:
        os.killpg(server.pid, signal.SIGKILL)
        server.wait(timeout=5)


def inspect_history(history, prompt_id, graph, case_id):
    record = history.get(prompt_id)
    if record is None:
        return None
    receipt = record.get('prompt')
    require(isinstance(receipt, list) and len(receipt) >= 4 and receipt[1] == prompt_id and receipt[2] == graph, 'History does not match request')
    status = record.get('status', {})
    messages = status.get('messages', [])
    require(not any(message[0] in ['execution_error', 'execution_interrupted'] for message in messages) and status.get('status_str') != 'error', 'Model error/OOM/interruption; no retry')
    if not status.get('completed'):
        return None
    require(status.get('status_str') == 'success', 'Unknown terminal status')
    cached = [message[1].get('nodes', []) for message in messages if message[0] == 'execution_cached']
    require(not any(nodes for nodes in cached), 'Unexpected cached nodes under cache-none')
    images = record.get('outputs', {}).get('12', {}).get('images', [])
    require(len(images) == 1 and images[0].get('type') == 'output', 'Exactly one genuine output required')
    metadata = images[0]
    require(metadata.get('subfolder', '') == '' and metadata['filename'].startswith(case_id + '_') and metadata['filename'].endswith('.png'), 'Wrong output file')
    return metadata


def execute(base, runtime, protocol, client, server, deadline, state):
    from PIL import Image
    for case in protocol['cases']:
        arm(deadline, 720)
        require(server.poll() is None and len(state['attempted']) < 6, 'Server stopped or cap reached')
        case_id = case['case_id']
        graph = load(base / (case_id + '.json'))['prompt']
        require(client.request('/queue') == {'queue_running': [], 'queue_pending': []}, 'Queue not empty or unknown')
        check = client.preflight(graph)
        persist(runtime / (case_id + '-preflight.json'), check)
        require(check['ok'], 'Actual graph schema check failed')
        filename = case['guide']
        require(graph['5']['inputs']['image']==filename and digest(runtime/'input'/filename)==digest(base/filename),'Changed guide')
        request = {'prompt': graph, 'client_id': 'G2_' + uuid.uuid4().hex}
        persist(runtime / (case_id + '-request.json'), request)
        attempt = {'case_id': case_id, 'started_utc': now().isoformat(), 'status': 'attempted', 'prompt_id': None}
        state['attempted'].append(attempt)
        state['phase'] = 'submitting_' + case_id
        persist(runtime / 'result.json', state)
        prompt_id = client.submit(graph, request['client_id'])
        attempt.update(status='accepted', prompt_id=prompt_id)
        state['accepted'].append({'case_id': case_id, 'prompt_id': prompt_id})
        persist(runtime / (case_id + '-accepted.json'), state['accepted'][-1])
        persist(runtime / 'result.json', state)
        while True:
            require(server.poll() is None, 'Owned server exited during inference')
            history = client.request('/history/' + prompt_id)
            persist(runtime / (case_id + '-history.json'), history)
            metadata = inspect_history(history, prompt_id, graph, case_id)
            if metadata is not None:
                output = safe_file(runtime / 'output', metadata['filename'])
                with Image.open(output) as image:
                    require(image.size == (1024, 1024) and image.format == 'PNG', 'Unexpected image dimensions/type')
                    image.load()
                persist(runtime / (case_id + '-output.json'), {'metadata': metadata, 'sha256': digest(output), 'bytes': output.stat().st_size})
                attempt.update(status='completed', finished_utc=now().isoformat())
                state['completed'].append(case_id)
                state['phase'] = 'completed_' + case_id
                persist(runtime / 'result.json', state)
                print(json.dumps({'phase': state['phase']}), flush=True)
                break
            time.sleep(2)


def run(base):
    protocol = validate_package(base)
    binding = load(base / 'binding.json')
    deadline, budget = binding_guard(binding, digest(base / 'manifest.json'), now())
    require(base == REMOTE and sys.executable == PYTHON and socket.gethostname() == INSTANCE, 'Wrong once directory or environment')
    require(not (base / 'runtime').exists(), 'Existing runtime; refuse reuse')
    with (base / 'stage.lock').open('x', encoding='utf-8') as lock:
        json.dump({'binding_sha256': digest(base / 'binding.json'), 'started_utc': now().isoformat()}, lock)
        lock.flush()
        os.fsync(lock.fileno())
    runtime = base / 'runtime'
    runtime.mkdir()
    for directory in ['input', 'output', 'temp', 'frozen']:
        (runtime / directory).mkdir()
    for name in list(load(base / 'manifest.json')) + ['manifest.json', 'binding.json']:
        (runtime / 'frozen' / name).write_bytes((base / name).read_bytes())
    for guide in sorted({case['guide'] for case in protocol['cases']}):
        (runtime/'input'/guide).write_bytes((base/guide).read_bytes())
    state = {'phase': 'preflight', 'attempted': [], 'accepted': [], 'completed': [], 'automatic_retries': 0,
             'instance_id': INSTANCE, 'started_utc': now().isoformat(), 'budget_guard': budget,
             'preparation_max_seconds': preparation_budget(deadline, now()), 'case_max_seconds': 720, 'shutdown_parent_UI_required': True}
    persist(runtime / 'result.json', state)
    server = None
    server_log = None

    def terminate(signum, frame):
        raise ProtectedStop('Deadline or external termination; stop without retry')

    try:
        for signum in [signal.SIGALRM, signal.SIGTERM, signal.SIGINT]:
            signal.signal(signum, terminate)
        arm(deadline, state['preparation_max_seconds'])
        preflight(base, runtime)
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 8188))
        command = [PYTHON, str(SOURCE / 'main.py'), '--listen', '127.0.0.1', '--port', '8188', '--disable-auto-launch', '--disable-all-custom-nodes', '--disable-partner-nodes', '--cache-none', '--input-directory', str(runtime / 'input'), '--output-directory', str(runtime / 'output'), '--temp-directory', str(runtime / 'temp')]
        persist(runtime / 'server-command.json', command)
        server_log = (runtime / 'comfy-server.log').open('x', encoding='utf-8')
        server = subprocess.Popen(command, cwd=SOURCE, stdout=server_log, stderr=subprocess.STDOUT, start_new_session=True)
        state.update(phase='starting_owned_server', owned_pid=server.pid)
        persist(runtime / 'result.json', state)
        client = ComfyClient('http://127.0.0.1:8188', timeout=5)
        while True:
            require(server.poll() is None, 'Owned Comfy failed to start')
            try:
                stats = client.request('/system_stats')
            except Exception:
                time.sleep(1)
                continue
            require(stats.get('system', {}).get('pytorch_version') == '2.8.0+cu128', 'Server Torch mismatch')
            require(any(device.get('type') == 'cuda' and GPU in device.get('name', '') and device.get('vram_total', 0) >= 24_000_000_000 for device in stats.get('devices', [])), 'Server hardware mismatch')
            persist(runtime / 'system-stats.json', stats)
            break
        state['preparation_finished_utc'] = now().isoformat()
        persist(runtime / 'result.json', state)
        require((deadline - now()).total_seconds() >= 6 * 720, 'Preparation consumed the six-case reserve; no submission')
        execute(base, runtime, protocol, client, server, deadline, state)
        state['phase'] = 'six_complete'
    except BaseException as error:
        state.update(phase='stopped_without_retry', error_type=type(error).__name__, error=str(error)[:2000])
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        try:
            stop_owned(server)
        except Exception as error:
            state['cleanup_error'] = str(error)
        if server_log is not None:
            server_log.close()
        state['finished_utc'] = now().isoformat()
        persist(runtime / 'result.json', state)
        target = base / 'g2-six-original-results.zip'
        with zipfile.ZipFile(target, 'x', zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(runtime.rglob('*')):
                if path.is_file() and not path.is_symlink() and 'temp' not in path.relative_to(runtime).parts and path.suffix != '.partial':
                    archive.write(path, path.relative_to(runtime).as_posix())
        print(json.dumps({'phase': state['phase'], 'archive_sha256': digest(target), 'archive_bytes': target.stat().st_size, 'shutdown_parent_UI_required': True}), flush=True)
    return 0 if state['phase'] == 'six_complete' else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--validate-only', action='store_true')
    arguments = parser.parse_args()
    if arguments.validate_only:
        print(json.dumps({'validated_cases': len(validate_package(BASE)['cases']), 'model_submissions': 0}))
    else:
        sys.exit(run(BASE))
