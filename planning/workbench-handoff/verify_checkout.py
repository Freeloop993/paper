"""Verify published handoff material in a fresh clone, using only Python's standard library."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile
import json
import sys

here = Path(__file__).resolve().parent
root = here.parents[1]
manifest = json.loads((here / "manifest.json").read_text(encoding="utf-8"))
errors = []
for item in manifest["files"]:
    target = (root / item["path"]).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        errors.append(f"Missing: {item['path']}")
        continue
    data = target.read_bytes()
    if item["format"] == "text-lf":
        data = data.replace(b"\r\n", b"\n")
    if sha256(data).hexdigest() != item["sha256"]:
        errors.append(f"Changed: {item['path']}")
package = root / "prototypes/drone-configurator/configurator-offline.zip"
if package.is_file():
    with ZipFile(package) as archive:
        if archive.testzip() or "index.html" not in archive.namelist():
            errors.append(f"Incomplete offline build: {package.name}")
if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"Verified {len(manifest['files'])} files, including the offline workbench.")
