"""Check the current study's image identity, independently of filename and blind ID."""
import json
from pathlib import Path

REGISTRY = Path(__file__).resolve().parents[2] / "evidence/formal-reset/image-registry.json"


def read_registry():
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def require_eligible(mode, original_sha, rgb_sha, registry):
    for row in registry["excluded_images"]:
        if original_sha == row["sha256"] or rgb_sha == row["rgb_sha256"]:
            raise ValueError("Retired or diagnostic image: " + row["id"])
    approved = registry[mode + "_images"]
    if not any(row["sha256"] == original_sha and row["rgb_sha256"] == rgb_sha for row in approved):
        raise ValueError("Image outside the current " + mode + " sample register.")
