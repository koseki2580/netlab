#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

CLAUDE_DIR = Path(__file__).resolve().parents[1]
ROOT = CLAUDE_DIR.parent
TEMPLATES = CLAUDE_DIR / "templates"
GUIDE = ROOT / "docs" / "user-guide"
SPEC = GUIDE / "specifications" / "specification.md"


def copy_if_missing(source: Path, target: Path) -> None:
    if target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    if source.is_dir():
        shutil.copytree(source, target)
    else:
        shutil.copy2(source, target)
    print(f"Created {target.relative_to(ROOT)}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec-only", action="store_true")
    args = parser.parse_args()

    copy_if_missing(TEMPLATES / "specification.md", SPEC)
    if args.spec_only:
        return 0

    copy_if_missing(TEMPLATES / "user-guide" / "README.md", GUIDE / "README.md")
    copy_if_missing(TEMPLATES / "user-guide" / "site", GUIDE / "site")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
