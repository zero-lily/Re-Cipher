#!/usr/bin/env python3
"""Import archived YouTube live chat into Re:Cipher's static viewer format.

Uses yt-dlp only for chat replay subtitles; does not download video media.
Usage:
  python scripts/import_archive.py --video 'https://youtu.be/NbVDBdORxvE'
  python scripts/import_archive.py --discover-channel
"""
import argparse
import datetime as dt
import json
import re
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_DIR = ROOT / "archive-data"
INDEX_PATH = ARCHIVE_DIR / "index.json"
CHANNEL_ID = "UCrXdSoIyfBmeKPsu0CggugQ"
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def get_video_id(value: str) -> str:
    value = value.strip()
    if VIDEO_ID.fullmatch(value):
        return value
    url = urlparse(value)
    host = (url.hostname or "").lower().removeprefix("www.").removeprefix("m.")
    candidate = None
    if url.scheme == "https" and host == "youtu.be":
        candidate = url.path.strip("/").split("/")[0]
    elif url.scheme == "https" and host == "youtube.com":
        candidate = parse_qs(url.query).get("v", [None])[0]
        if candidate is None:
            parts = url.path.strip("/").split("/")
            if len(parts) >= 2 and parts[0] in ("live", "shorts", "embed"):
                candidate = parts[1]
    if not candidate or not VIDEO_ID.fullmatch(candidate):
        raise ValueError("YouTube動画のURLか11文字の動画IDを指定してください")
    return candidate


def read_text(part):
    if not isinstance(part, dict):
        return ""
    if isinstance(part.get("simpleText"), str):
        return part["simpleText"]
    result = []
    for run in part.get("runs", []):
        if "text" in run:
            result.append(run["text"])
        elif "emoji" in run:
            emoji = run["emoji"]
            result.append((emoji.get("shortcuts") or [emoji.get("emojiId") or ""])[0])
    return "".join(result)


def parse_live_chat(path: Path) -> list[list]:
    result = []
    seen = set()
    bad = 0
    with path.open(encoding="utf-8-sig") as file:
        for line in file:
            if not line.strip():
                continue
            try:
                replay = json.loads(line)["replayChatItemAction"]
                seconds = round(float(replay["videoOffsetTimeMsec"]) / 1000, 3)
            except (ValueError, KeyError, TypeError, json.JSONDecodeError):
                bad += 1
                continue
            if not 0 <= seconds < 864000:
                continue
            for action in replay.get("actions", []):
                item = (action.get("addChatItemAction", {}).get("item")
                        or action.get("replaceChatItemAction", {}).get("replacementItem")
                        or {})
                message = (item.get("liveChatTextMessageRenderer")
                           or item.get("liveChatPaidMessageRenderer")
                           or item.get("liveChatMembershipItemRenderer"))
                if not isinstance(message, dict):
                    continue
                text = read_text(message.get("message")) or read_text(message.get("headerSubtext"))
                if not text:
                    continue
                msg_id = message.get("id")
                if msg_id and msg_id in seen:
                    continue
                if msg_id:
                    seen.add(msg_id)
                author = read_text(message.get("authorName")) or "視聴者"
                result.append([seconds, author[:150], text[:2000]])
    result.sort(key=lambda r: r[0])
    print("解析結果:", len(result), "件; 読み取れなかったイベント:", bad)
    return result


def download_chat(video_id: str) -> dict:
    url = "https://www.youtube.com/watch?v=" + video_id
    with tempfile.TemporaryDirectory(prefix="recipher_") as work:
        base = Path(work) / video_id
        cmd = [
            "yt-dlp", "--no-playlist", "--no-simulate",
            "--skip-download", "--write-subs", "--sub-langs", "live_chat",
            "--sub-format", "json", "--write-info-json",
            "--no-warnings", "--output", str(base), url,
        ]
        print("チャット取得:", url, flush=True)
        # Deno is installed on Actions, but runner IP reputation can still
        # prevent access. Try one alternate, unauthenticated YouTube client
        # before giving users a concrete fallback. Never collect account cookies.
        profiles = [
            ("標準", []),
            ("代替クライアント", [
                "--force-ipv4", "--extractor-args",
                "youtube:player_client=tv,web_safari",
            ]),
        ]
        failures = []
        for label, options in profiles:
            print("取得方式:", label, flush=True)
            completed = subprocess.run(
                cmd[:-1] + options + [url],
                capture_output=True, text=True, timeout=1200,
            )
            if completed.returncode == 0:
                break
            failure = (completed.stderr or completed.stdout or "")[-1600:]
            failures.append(label + ": " + failure)
            if ("Sign in to confirm" not in failure
                    and "not a bot" not in failure):
                break
        if completed.returncode:
            combined = "\n".join(failures)
            if "Sign in to confirm" in combined or "not a bot" in combined:
                raise RuntimeError(
                    "YouTubeがこのGitHub Actions実行環境からのアクセスを拒否しました。"
                    " Denoや取得クライアントを変えても解消しない場合があります。"
                    " PCでyt-dlpからチャットを取得し、Re:Cipherビューアで"
                    " GitHub登録用JSONに変換してアップロードしてください。"
                    " YouTubeのログインCookieをGitHubへ登録しないでください。"
                    "\n" + combined[-1200:]
                )
            raise RuntimeError(
                "yt-dlpでチャットを取得できませんでした: "
                + combined[-1200:]
            )
        candidates = list(Path(work).glob("*.live_chat.json"))
        if not candidates:
            raise RuntimeError("この動画のチャットリプレイが見つかりません（無効・未公開・取得制限の可能性）。")
        messages = parse_live_chat(candidates[0])
        if not messages:
            raise RuntimeError("チャットリプレイを解析できませんでした。")
        infos = list(Path(work).glob("*.info.json"))
        info = json.loads(infos[0].read_text(encoding="utf-8")) if infos else {}
        return {
            "format": "recipher-chat-v1",
            "videoId": video_id,
            "title": info.get("title") or ("YouTube アーカイブ " + video_id),
            "channel": info.get("channel") or info.get("uploader") or "",
            "source": "yt-dlp live_chat replay",
            "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "messages": messages,
        }


def save_archive(data: dict):
    ARCHIVE_DIR.mkdir(exist_ok=True, parents=True)
    target = ARCHIVE_DIR / (data["videoId"] + ".json")
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    if INDEX_PATH.exists():
        index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    else:
        index = {"format": "recipher-index-v1", "videos": []}
    existing = [v for v in index.get("videos", []) if v.get("videoId") != data["videoId"]]
    entry = {
        "videoId": data["videoId"], "title": data["title"],
        "channel": data.get("channel") or "YouTube",
        "count": len(data["messages"]),
        "source": data.get("source", "yt-dlp"),
        "updatedAt": data["updatedAt"],
    }
    index["videos"] = [entry] + existing
    INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("保存:", target, "総", len(data["messages"]), "件")


def discover_latest_ids():
    url = "https://www.youtube.com/channel/" + CHANNEL_ID + "/streams"
    cmd = ["yt-dlp", "--flat-playlist", "--playlist-end", "12",
           "--dump-single-json", "--skip-download", "--no-warnings", url]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if result.returncode:
        raise RuntimeError("配信一覧を取得できません: " + (result.stderr or "")[-700:])
    listing = json.loads(result.stdout)
    ids = []
    for item in listing.get("entries") or []:
        if not isinstance(item, dict):
            continue
        id_ = item.get("id")
        status = item.get("live_status")
        if VIDEO_ID.fullmatch(id_ or "") and status not in ("is_live", "is_upcoming"):
            ids.append(id_)
    return ids


def main():
    parser = argparse.ArgumentParser()
    options = parser.add_mutually_exclusive_group(required=True)
    options.add_argument("--video", help="YouTube動画URLまたはID")
    options.add_argument("--discover-channel", action="store_true", help="トーアの最近の配信から未収録アーカイブを探す")
    args = parser.parse_args()
    if args.video:
        data = download_chat(get_video_id(args.video))
        save_archive(data)
        return
    existing = {p.stem for p in ARCHIVE_DIR.glob("???????????.json")}
    ids = discover_latest_ids()
    print("最近の配信候補:", ids)
    added = 0
    for id_ in ids:
        if id_ in existing:
            continue
        try:
            save_archive(download_chat(id_))
            added += 1
        except Exception as exc:
            print("スキップ:", id_, str(exc)[-300:])
        if added >= 2:
            break
    print("新規追加:", added)


if __name__ == "__main__":
    main()
