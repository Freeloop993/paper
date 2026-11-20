"""Compile offline B02 visual-arm requests. No submission, network or billing code."""
# Adapted from the verified B02 free-form v1 compiler.
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "S1-B1-T.json"
TEMPLATE_SHA = "753ce8bf58aa232f4f5a71d1761572310d7aba7a8ed612af6d1997f9bcd539b6"
BRIEF = ("Develop one four-rotor concept for everyday personal aerial photography. "
         "Communicate compactness, simplicity and considered detailing. Resolve the camera/body "
         "relationship and the transitions from the body to the four arms. Choose the body silhouette, "
         "sections, surface language and distribution of materials to serve your concept.")
TASKS = {"A": "Focus on the integration of the front camera into the body volume; retain clear arm connections.",
         "B": "Focus on how the four arm roots meet the body; retain an identifiable front camera."}
VIEW = ("Show the complete drone in one front three-quarter view from slightly above. Use a plain "
        "background and soft lighting so the body depth, camera region and junctions are readable.")
NEGATIVE = "cropped product, collage, labels, watermark, disconnected arms, extra rotor"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def clean_text(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Missing operator text")
    return value.strip()


def compile_input(task, method, edit, seed, parent_digest=None):
    if task not in TASKS or method not in ("D", "S"):
        raise ValueError("Unknown task or method")
    if type(seed) is not int or not 0 <= seed < 2**53:
        raise ValueError("Invalid seed")
    if not isinstance(edit, dict):
        raise ValueError("Expected operator fields")
    fields = ("instruction",) if method == "D" else ("part", "change", "keep")
    if set(edit) != set(fields):
        raise ValueError("Invalid input fields for this method")
    values = [clean_text(edit[field]) for field in fields]
    operator = values[0] if method == "D" else "\n".join(
        f"{label}: {value}" for label, value in zip(("Part", "Intended change", "Keep"), values))
    source = TEMPLATE.read_bytes()
    if sha(source) != TEMPLATE_SHA:
        raise ValueError("Unexpected historical backend template")
    request = json.loads(source)
    graph = request["prompt"]
    encoder = graph["4"]["inputs"]
    encoder["prompt"] = "\n\n".join((BRIEF, TASKS[task], VIEW, operator))
    encoder["negative_prompt"] = NEGATIVE
    graph["10"]["inputs"]["seed"] = seed
    graph["12"]["inputs"]["filename_prefix"] = "B02-offline-input"
    if parent_digest is not None:
        if not isinstance(parent_digest, str) or len(parent_digest) != 64 or any(
                digit not in "0123456789abcdef" for digit in parent_digest):
            raise ValueError("Expected a verified SHA256, not a cloud filename or URL")
        graph["15"] = {"class_type": "LoadImage", "inputs": {"image": f"parent-{parent_digest}.png"}}
        encoder["images.image_1"] = ["15", 0]
        encoder["vae"] = ["3", 0]
    return request
