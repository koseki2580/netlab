#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

CLAUDE_DIR = Path(__file__).resolve().parents[1]
ROOT = CLAUDE_DIR.parent
GUIDE = ROOT / "docs" / "user-guide"
SITE = GUIDE / "site"

REQUIRED = [
    GUIDE / "README.md",
    GUIDE / "specifications" / "specification.md",
    SITE / "index.html",
    SITE / "assets" / "css" / "styles.css",
    SITE / "assets" / "js" / "content.js",
    SITE / "assets" / "js" / "app.js",
]


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []

    for path in REQUIRED:
        if not path.is_file():
            fail(f"missing required file: {path.relative_to(ROOT)}", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1

    texts: dict[Path, str] = {}
    for path in REQUIRED:
        try:
            texts[path] = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            fail(f"not valid UTF-8: {path.relative_to(ROOT)}", errors)

    html = texts[SITE / "index.html"]
    app_js = texts[SITE / "assets" / "js" / "app.js"]
    content_js = texts[SITE / "assets" / "js" / "content.js"]
    spec = texts[GUIDE / "specifications" / "specification.md"]

    for element_id in ["language-select", "search-input", "theme-toggle", "toc", "content"]:
        if f'id="{element_id}"' not in html:
            fail(f"index.html missing required control/content id: {element_id}", errors)

    if not re.search(r'<aside\b[^>]*class="[^"]*\bsidebar\b[^"]*"', html, flags=re.IGNORECASE):
        fail("index.html must provide a sidebar navigation container", errors)

    # Core local assets must be relative and exist. External normal hyperlinks are allowed,
    # but scripts/styles/images used by the guide must not depend on the network.
    asset_patterns = [
        r'<script[^>]+src="([^"]+)"',
        r'<link[^>]+href="([^"]+)"',
        r'<img[^>]+src="([^"]+)"',
        r'<source[^>]+src="([^"]+)"',
    ]
    refs: list[str] = []
    for pattern in asset_patterns:
        refs.extend(re.findall(pattern, html, flags=re.IGNORECASE))

    for ref in refs:
        if re.match(r"^(?:https?:)?//", ref, flags=re.IGNORECASE):
            fail(f"external core asset is not offline-safe: {ref}", errors)
            continue
        if ref.startswith(("data:", "#")):
            continue
        target = (SITE / ref).resolve()
        try:
            target.relative_to(SITE.resolve())
        except ValueError:
            fail(f"asset escapes site directory: {ref}", errors)
            continue
        if not target.is_file():
            fail(f"referenced asset does not exist: {ref}", errors)

    if re.search(r"\bfetch\s*\(", app_js):
        fail("app.js uses fetch(); local file:// fetching is intentionally disallowed", errors)
    if "XMLHttpRequest" in app_js:
        fail("app.js uses XMLHttpRequest; keep the guide file:// friendly", errors)
    if "prefers-color-scheme" not in app_js and "prefers-color-scheme" not in texts[SITE / "assets" / "css" / "styles.css"]:
        fail("theme implementation does not reference prefers-color-scheme", errors)
    if "localStorage" not in app_js:
        fail("theme/language preferences are not persisted when storage is available", errors)
    if not re.search(r"\bja\s*:", content_js) or not re.search(r"\ben\s*:", content_js):
        fail("content.js must provide both ja and en language bundles", errors)
    required_spec_sections = [
        "Functional requirements",
        "Non-functional requirements",
        "Constraints and compatibility",
        "Failure behavior and edge cases",
        "Security considerations",
        "Migration and backward compatibility",
        "Acceptance criteria",
        "Behavior test cases",
        "Specification quality checklist",
        "Traceability",
    ]
    for section in required_spec_sections:
        if section not in spec:
            fail(f"specification missing required section: {section}", errors)

    if "REQ-001" not in spec or "AC-001" not in spec or "TC-001" not in spec:
        fail("specification must include stable requirement, acceptance, and behavior test-case IDs", errors)

    if "- [ ]" not in spec and "- [x]" not in spec and "- [X]" not in spec:
        fail("specification quality checklist must contain checklist items", errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        print(f"Validation failed with {len(errors)} error(s).")
        return 1

    print("Documentation validation passed.")
    print(f"Portable guide root: {GUIDE.relative_to(ROOT)}")
    print("Entry point: docs/user-guide/site/index.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
