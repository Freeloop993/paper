"""Package the complete Vite output, preserving relative URLs when opened via file://."""
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
if not (dist / "index.html").is_file():
    raise SystemExit("Build the application first.")
with NamedTemporaryFile(dir=root, suffix=".zip", delete=False) as stage:
    target = Path(stage.name)
try:
    with ZipFile(target, "w") as delivery:
        for source in sorted(dist.rglob("*")):
            if source.is_file():
                item = ZipInfo(source.relative_to(dist).as_posix())
                item.compress_type = ZIP_DEFLATED
                delivery.writestr(item, source.read_bytes())
    with ZipFile(target) as check:
        if check.testzip() is not None:
            raise ValueError("Archive verification failed.")
    target.replace(root / "configurator-offline.zip")
finally:
    target.unlink(missing_ok=True)
