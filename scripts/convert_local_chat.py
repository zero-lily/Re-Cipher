#!/usr/bin/env python3
"""Convert locally downloaded yt-dlp chat replay to Re:Cipher public archive JSON.

Offline only: no YouTube API, GitHub credentials, browser cookies or network.
Direct publishing requires GitHub repository write access.

Usage:
 python scripts/convert_local_chat.py --file "video.live_chat.json" --video hiYdiF8PnMI \
     --title "配信タイトル"
Then upload archive-data/hiYdiF8PnMI.json via GitHub's authenticated repository UI.
"""
import argparse
import datetime as dt
import json
from pathlib import Path

from import_archive import ARCHIVE_DIR, get_video_id, parse_live_chat


def main():
    parser = argparse.ArgumentParser(description="ローカルのyt-dlpチャットをGitHub公開用JSONに変換")
    parser.add_argument("--file", required=True, type=Path, help=".live_chat.jsonのパス")
    parser.add_argument("--video", required=True, help="動画URLか11文字のID")
    parser.add_argument("--title", default=None, help="アーカイブ表示タイトル")
    parser.add_argument("--channel", default="新宝島トーア", help="表示チャンネル名")
    args = parser.parse_args()

    video_id = get_video_id(args.video)
    if not args.file.is_file():
        parser.error("ファイルが見つかりません: " + str(args.file))
    messages = parse_live_chat(args.file)
    if not messages:
        parser.error("チャットメッセージを読み取れませんでした")

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    path = ARCHIVE_DIR / (video_id + ".json")
    if path.exists():
        parser.error("同じ動画の登録ファイルが存在します。上書き前に差分をご確認ください: " + str(path))
    data = {
        "format": "recipher-chat-v1",
        "videoId": video_id,
        "title": args.title or args.file.name.replace(".live_chat.json", ""),
        "channel": args.channel,
        "source": "yt-dlp live_chat replay (local import)",
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "messages": messages,
    }
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("変換完了:", path)
    print("チャット:", len(messages), "件")
    print("このJSONには投稿者名・チャット本文が含まれます。GitHubに登録すると一般公開されます。")
    print("公開登録はGitHubリポジトリへの書き込み権限を持つ管理者が実施してください。")


if __name__ == "__main__":
    main()
