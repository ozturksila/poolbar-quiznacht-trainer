#!/usr/bin/env python3
"""
Bundle index.html + css/style.css + js/*.js + one questions/*.json set into
a single self-contained HTML file (no fetch(), no external files) that can
be opened directly (file://) or emailed/sent as an attachment.

Usage:
    python3 scripts/build_standalone.py questions/2026-07-25.json
    python3 scripts/build_standalone.py questions/2026-07-25.json --out dist/day1.html
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def find_manifest_entry(question_file: Path):
    manifest_path = ROOT / "questions" / "manifest.json"
    if not manifest_path.exists():
        return None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for entry in manifest.get("sets", []):
        if entry.get("file") == question_file.name:
            return entry
    return None


def build(question_file: Path, out_path: Path):
    questions = json.loads(question_file.read_text(encoding="utf-8"))
    entry = find_manifest_entry(question_file)
    meta = {
        "id": (entry or {}).get("id", question_file.stem),
        "label": (entry or {}).get("label", question_file.stem),
        "questionCount": len(questions),
    }

    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    storage_js = (ROOT / "js" / "storage.js").read_text(encoding="utf-8")
    quiz_js = (ROOT / "js" / "quiz.js").read_text(encoding="utf-8")
    app_js = (ROOT / "js" / "app.js").read_text(encoding="utf-8")

    data_js = (
        f"window.EMBEDDED_SET_META = {json.dumps(meta, ensure_ascii=False)};\n"
        f"window.EMBEDDED_QUESTIONS = {json.dumps(questions, ensure_ascii=False)};\n"
    )

    bundled_script = "\n".join([data_js, storage_js, quiz_js, app_js])

    html = index_html
    html = re.sub(
        r'<link rel="stylesheet" href="css/style\.css"\s*/?>',
        f"<style>\n{css}\n</style>",
        html,
    )
    html = re.sub(
        r'\s*<script src="js/storage\.js"></script>\s*'
        r'<script src="js/quiz\.js"></script>\s*'
        r'<script src="js/app\.js"></script>',
        f"\n<script>\n{bundled_script}\n</script>\n",
        html,
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    return out_path, meta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("question_file", help="Path to a questions/*.json set")
    parser.add_argument("--out", help="Output .html path (default: dist/<set-id>.html)")
    args = parser.parse_args()

    question_file = Path(args.question_file)
    if not question_file.is_absolute():
        question_file = ROOT / question_file
    if not question_file.exists():
        print(f"Question file not found: {question_file}", file=sys.stderr)
        sys.exit(1)

    if args.out:
        out_path = Path(args.out)
        if not out_path.is_absolute():
            out_path = ROOT / out_path
    else:
        out_path = ROOT / "dist" / f"{question_file.stem}.html"

    out_path, meta = build(question_file, out_path)
    print(f"Built {out_path} ({meta['questionCount']} questions, set '{meta['label']}')")


if __name__ == "__main__":
    main()
