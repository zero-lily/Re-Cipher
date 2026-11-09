#!/usr/bin/env python3
"""Build archive-data/index.json from videoId.json files uploaded through GitHub UI.

No YouTube access required. Only public chat data already in the repository
is read. Safe to rerun on every archive-data/*.json push.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / "archive-data"
INDEX = DIRECTORY / "index.json"
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def main():
    previous = {}
    if INDEX.exists():
        existing = json.loads(INDEX.read_text(encoding="utf-8"))
        previous = {v["videoId"]: v for v in existing.get("videos", []) if "videoId" in v}
    items = []
    for path in DIRECTORY.glob("*.json"):
        if path.name == "index.json" or not VIDEO_ID.fullmatch(path.stem):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Invalid archive JSON {path.name}: {exc}") from exc
        if data.get("format") != "recipher-chat-v1":
            raise RuntimeError(f"Unexpected archive format in {path.name}")
        if data.get("videoId") != path.stem:
            raise RuntimeError(f"videoId and filename mismatch: {path.name}")
        messages = data.get("messages")
        if not isinstance(messages, list) or not messages:
            raise RuntimeError(f"No chat messages in {path.name}")
        old = previous.get(path.stem, {})
        items.append({
            "videoId": path.stem,
            "title": data.get("title") or old.get("title") or ("YouTube " + path.stem),
            "channel": data.get("channel") or old.get("channel") or "",
            "count": len(messages),
            "source": data.get("source") or old.get("source") or "local import",
            "updatedAt": data.get("updatedAt") or old.get("updatedAt") or "",
        })
    items.sort(key=lambda entry: (entry["updatedAt"], entry["videoId"]), reverse=True)
    output = {"format": "recipher-index-v1", "videos": items}
    INDEX.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Rebuilt {INDEX} with {len(items)} archives.")


if __name__ == "__main__":
    main()
