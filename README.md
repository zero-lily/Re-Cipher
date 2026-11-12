# Re:Cipher — ネタバレ防止言語

YouTubeの動画コメント・ライブチャットで、うっかりネタバレを目にしないための非公式ツールです。文章を `ネタバレ防止言語:` から始まる文字列へ変換し、見たい人だけ復号できます。

## 使い方

### 1. 暗号化・復号サイト（スマホ対応）

**[Re:Cipherの暗号化・復号サイトを開く](https://zero-lily.github.io/Re-Cipher/)**

文章を入力して暗号化し、YouTubeのコメントやライブチャットへコピーできます。受け取った暗号文の復号にも利用できます。

### 2. アーカイブ視聴・チャットビューア（スマホ対応）

**[アーカイブビューアを開く](https://zero-lily.github.io/Re-Cipher/viewer.html)**

登録済みの動画を選ぶと、YouTubeの動画とチャットを同時に表示します。チャットは動画の再生位置と連動します。

表示設定は次の3種類です。

- **自動復号**：暗号投稿の接頭辞を残し、復号した本文を色付きで表示。
- **暗号投稿を非表示**：暗号投稿全体を隠す。
- **動画に追従**：再生位置に合わせて最新のチャットを表示。

現在視聴できるアーカイブ：

- [第16〜18話・同時視聴（7,006件）](https://zero-lily.github.io/Re-Cipher/viewer.html?v=NbVDBdORxvE)
- [第22・23話・同時視聴（4,664件）](https://zero-lily.github.io/Re-Cipher/viewer.html?v=hiYdiF8PnMI)

YouTubeのURLを入力することもできますが、**未登録の動画は動画再生のみ**となり、チャットの復号・非表示には対応しません。チャット登録は管理者が行うため、一般向けビューアにファイルのアップロード機能はありません。

配信中のチャット自動取得は現在未対応です。アーカイブ再生専用の機能です。

### 3. Chrome拡張機能（PC向け）

**[最新版のChrome拡張機能をダウンロード](https://github.com/zero-lily/Re-Cipher/releases/latest)**

Chrome拡張では、通常のYouTube画面のコメント・ライブチャットで暗号投稿を色付きで復号できます。また、暗号化、手動復号、投稿の非表示、送信先を確認してからの投稿に対応しています。

#### インストール方法（Windows・Chrome）

1. リリースページの「Assets」から **`Re-Cipher-Chrome-v*.zip`** をダウンロードします。**`Source code (zip)` はインストール用ではありません。**
2. ZIPを右クリックし、「すべて展開」を選択します。
3. Chromeで `chrome://extensions` を開き、デベロッパーモードをオンにします。
4. 「パッケージ化されていない拡張機能を読み込む」から、展開したフォルダ（`manifest.json` が直接ある場所）を選びます。
5. YouTubeのページを再読み込みします。

**v1.1.7 の追加機能**

- **下書き自動保存**：暗号化本文・前後に付ける通常文・手動復号欄の入力を、使用中のChromeのローカルストレージに保存します。ポップアップを閉じたりタブを移動したりしても、次に開いたときに復元します。同期はされません。各「クリア」で入力と保存内容を消せます。
- **平文の併記**：暗号化欄の「通常の文章も併記する（任意）」を開き、暗号文の前と後に通常の文章を付けられます。後ろの文章には区切りの `【平文】` を自動挿入します。送信する場合は平文も含む全文の文字数が上限の対象です。
- **途中の暗号を自動復号**：通常の文章が先頭にあっても、その後の `ネタバレ防止言語:` / `Re信号:` を検出し、暗号部分だけ色付きで復号します。手動復号でも併記文章を扱えます。
- **手入力の併記**：暗号の後に自分で平文をつなぐ場合は、改行か空白で区切るか、`【平文】` を入れてください。区切りなしで連結すると境界を確実には判定できません。


バージョン更新時は最新版ZIPを展開し、**同じ拡張機能フォルダ**の中身を更新してから `chrome://extensions` で再読み込みし、YouTubeのページも再読み込みしてください。フォルダを変えると新しい拡張機能として認識され、以前の下書きにアクセスできなくなる場合があります。GitHub配布版は自動更新されません。

### v1.1.8: 長文コメントの復号不具合を修正

v1.1.7で自動復号に失敗していた原因（接頭辞判定関数の参照エラー）を修正しました。

長文コメントは、YouTubeの「詳細」を押す前に暗号文が途中で省略されることがあります。**省略中は元のコメントと「詳細」を維持**し、展開後に全文を読み直して復号します。長文の復号結果は「復号結果」として元のコメントの下に表示します。短いコメントは従来どおり本文を置き換えます。

※ コメントの内容が変更されたりYouTube側の表示構造が変わった場合は、ページを再読み込みしてください。配布用ZIPの更新後はChrome拡張機能とYouTubeページの両方を再読み込みしてください。

### 対応する接頭辞

新規の暗号文は `ネタバレ防止言語:` を使います。旧 `Re信号:` の投稿も引き続き復号できます。

## ご利用上の注意

- この仕組みは**難読化**です。暗号学的な秘匿性はなく、変換サイトを使えば誰でも復号できます。
- Re:Zeroの権利者およびYouTubeとは関係のない、非公式ファンツールです。
- アーカイブビューアには、配信中に公開されていた投稿者名とチャット本文のデータを使用します。取得可能なアーカイブやチャットは変動します。
- コメントや動画の取り扱いでは、YouTubeの利用条件や投稿者の権利にご配慮ください。お問い合わせは[GitHub Issues](https://github.com/zero-lily/Re-Cipher/issues)までお願いします。

---

## 管理者向けメモ（サイト利用者はここを読む必要はありません）

以下はリポジトリの管理、配布、チャット取得のための運用記録です。**公開サイトからのチャットアップロードは設けず、GitHubで書き込み権限を持つ管理者だけが `main` に直接登録します。**

### リポジトリの構成

| ファイル・ディレクトリ | 用途 |
|---|---|
| `index.html` | 暗号化・復号のWebサイト |
| `viewer.html`, `viewer.js` | アーカイブ再生・チャット復号ビューア |
| `archive-data/index.json` | 公開アーカイブの一覧 |
| `archive-data/<videoId>.json` | 動画ごとの公開チャットデータ |
| `codec-v3.json` | 現行の復号辞書 |
| `chrome-extension/` | Chrome拡張機能のソース |
| `scripts/import_archive.py` | yt-dlpでの取得と登録 |
| `scripts/convert_local_chat.py` | ローカルで取得済みのチャットをJSONへ変換 |
| `scripts/rebuild_archive_index.py` | 一覧の再生成 |

### アーカイブチャットの追加方法

**A. GitHub Actionsから取得（失敗することがあります）**

[Import YouTube archived chat (yt-dlp)](https://github.com/zero-lily/Re-Cipher/actions/workflows/archive-import.yml) で「Run workflow」を選び、動画URLを入力します。

GitHub ActionsのホストIPはYouTubeからボット判定で拒否されることがあり、Denoや取得方式を変えても成功する保証はありません。このため、毎日の自動取得は一時停止しています。**YouTubeアカウントのCookieをGitHub Secretsやリポジトリに登録しないでください。**

**B. PCで取得して、管理者がGitHubに登録（推奨）**

Windowsの場合、必要に応じてyt-dlpとDenoをインストールします。登録用変換にはPythonも必要です。

```powershell
winget install --id yt-dlp.yt-dlp
winget install --id DenoLand.Deno
```

PowerShellを開き直してチャットリプレイだけを取得します。

```powershell
yt-dlp --no-playlist --skip-download --write-subs --sub-langs live_chat --sub-format json "https://www.youtube.com/watch?v=VIDEO_ID"
```

リポジトリの作業フォルダで、取得済みファイルを公開形式に変換します。

```powershell
python scripts/convert_local_chat.py --file "取得ファイル.live_chat.json" --video "VIDEO_ID" --title "配信タイトル"
```

このスクリプトは `archive-data/VIDEO_ID.json` を生成し、既存の同名ファイルを上書きしません。生成したJSONには**投稿者名・チャット本文が含まれ、公開リポジトリに登録すると誰でも閲覧できます**。内容を確認してから、[archive-dataへのアップロード画面](https://github.com/zero-lily/Re-Cipher/upload/main/archive-data)でコミットしてください。

`archive-data/*.json` の追加時は [一覧更新ワークフロー](https://github.com/zero-lily/Re-Cipher/actions/workflows/rebuild-archive-index.yml) が `index.json` を再生成します。ワークフローが失敗したときは `python scripts/rebuild_archive_index.py` を実行し、その変更もコミットします。ワークフローの実行にはGitHub Actionsの書き込み権限が必要です。

### Chrome拡張のリリース

Chrome拡張の配布用ZIPは、リポジトリ全体のZIPではなく `chrome-extension/` の内容だけを含みます。拡張機能の `manifest.json` のバージョンを更新して `main` に反映すると、[Chrome拡張のReleaseワークフロー](https://github.com/zero-lily/Re-Cipher/actions/workflows/chrome-extension-release.yml) がZIPを生成してReleasesへ添付します。

辞書は `codec-v3.json` から取得します。辞書の登録語句を増やす場合も、**既存符号の意味は変えず、古い暗号の復号互換性を保ってください**。アルゴリズム自体の変更は拡張機能の更新が必要です。

### 現在の運用制約

- アーカイブは登録済みJSONをGitHub Pagesから配信します。URLを貼るだけで新規動画のチャットを取得する仕組みはありません。
- GitHub ActionsによるYouTubeへの直接アクセスは制限されることがあります。ローカル取得を優先します。
- 配信中のリアルタイムチャット連携は未実装です。実現にはAPI・共有取得サーバー等が必要です。
- 公開チャットデータの保存・再配信と利用条件については、運用前に継続確認してください。
