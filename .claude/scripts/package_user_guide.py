#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
import zipfile
from pathlib import Path

CLAUDE_DIR = Path(__file__).resolve().parents[1]
ROOT = CLAUDE_DIR.parent
GUIDE = ROOT / "docs" / "user-guide"
DIST = ROOT / "dist"
OUTPUT = DIST / "user-guide.zip"


def main() -> int:
    validation = subprocess.run(
        [sys.executable, str(CLAUDE_DIR / "scripts" / "validate_docs.py")],
        cwd=ROOT,
        check=False,
    )
    if validation.returncode != 0:
        print("Packaging aborted because documentation validation failed.")
        return validation.returncode

    DIST.mkdir(parents=True, exist_ok=True)
    if OUTPUT.exists():
        OUTPUT.unlink()

    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(GUIDE.rglob("*")):
            if path.is_file():
                relative = path.relative_to(GUIDE)
                archive.write(path, Path("user-guide") / relative)

    print(f"Created {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
