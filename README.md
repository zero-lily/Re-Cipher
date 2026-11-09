# Re:Cipher — リゼロ風 暗号化・復号ツール

YouTubeのコメントやライブチャットで使う非公式の換字ツールです。文章を `ネタバレ防止言語:` から始まる文字列に変換できます。見たい人だけが元の文章に復号できます。

## ブラウザ版（インストール不要）

**[Re:Cipherを開く](https://zero-lily.github.io/Re-Cipher/)**

文章の暗号化・復号・コピーができます。

## YouTubeアーカイブ・チャットビューア（スマホ対応）

**[アーカイブビューアを開く](https://zero-lily.github.io/Re-Cipher/viewer.html)**

- YouTubeの動画を埋め込んで再生し、再生時刻に合わせてチャットを表示します。
- 「自動復号」「暗号投稿を非表示」「動画に追従」を個別に切り替えられます。
- 新しい接頭辞 `ネタバレ防止言語:` と旧接頭辞 `Re信号:` の両方を復号できます。
- 初期データとして、以前取得した新宝島トーアの同時視聴アーカイブ [NbVDBdORxvE](https://zero-lily.github.io/Re-Cipher/viewer.html?v=NbVDBdORxvE) のチャット7,006件を公開しています。
- 別のYouTube URLを入力して動画を開き、手元の `.live_chat.json`（yt-dlp）またはチャットCSVを読み込めます。ファイルの読み込み・復号は端末内で行います。

### ほかのアーカイブをサイトの一覧に追加する

**GitHub Actionsでの直接取得（簡単ですが、YouTubeから拒否されることがあります）**

リポジトリの管理者は、[Import YouTube archived chat ワークフロー](https://github.com/zero-lily/Re-Cipher/actions/workflows/archive-import.yml) の「Run workflow」で動画URLを指定できます。Denoを追加し、yt-dlpの代替取得方式も試しますが、**GitHub Actions実行環境のIPがYouTubeにブロックされる場合は成功を保証できません**。YouTubeのCookieをGitHubへ登録しないでください。

**GitHub ActionsがYouTubeに拒否されたとき（Windows PCから取得・アップロード）**

1. WindowsのPowerShellで下記の2行を一度だけ実行し、yt-dlpとDenoをインストールします。
2. PowerShellを一度閉じ、開き直してから動画URLを指定して取得します。
3. [アーカイブビューア](https://zero-lily.github.io/Re-Cipher/viewer.html)で同じ動画URLを開き、取得した `.live_chat.json` ファイルを選びます。
4. 「GitHub登録用JSONを保存」を押すと `動画ID.json` が生成されます。これは公開するチャット本文を含むファイルです。
5. [GitHubの `archive-data/` へのアップロード](https://github.com/zero-lily/Re-Cipher/upload/main/archive-data)で保存したJSONを追加し、「Commit changes」を押します。自動ワークフローがアーカイブ一覧を更新します。一般公開されるため、ファイルの中身を確認してください。

インストール：

```powershell
winget install --source winget --id yt-dlp.yt-dlp
winget install --source winget --id DenoLand.Deno
```

チャットのみ取得（例：今回失敗した動画）：

```powershell
yt-dlp --no-playlist --skip-download --write-subs --sub-langs live_chat --sub-format json -o "%(id)s.%(ext)s" "https://www.youtube.com/watch?v=hiYdiF8PnMI"
```

保存される `.live_chat.json` は、動画ファイルではなくチャットリプレイのテキストです。すべてのアーカイブにチャット履歴があるわけではありません。自分のPCからでも取得が拒否される場合は、別の方法が必要です。

**自動追加の仕組み**

- [登録済みチャット一覧](./archive-data/index.json)
- [アーカイブ一覧再構築ワークフロー](./.github/workflows/rebuild-archive-index.yml)
- [取得用Pythonスクリプト](./scripts/import_archive.py)

YouTubeからの自動取得を1日1回行うスケジュールは、GitHub側のボット判定で失敗が続く可能性があるため、一旦停止しています。GitHubのURLからyt-dlpを実行する仕組みは残しています。

### ライブ配信について

配信中のチャットをリアルタイム取得・復号するには、公式YouTube Data APIと共有取得用サーバーなどの別途構成が必要です。**現在のビューアはアーカイブ専用**で、サイト内のライブチャット自動取得は未実装です。サイトから公式の新宝島トーアのライブ配信ページを開けます。

取得済みチャットの再配信には第三者の投稿が含まれます。利用に際してはYouTubeの規約および投稿者の権利に留意してください。異議がある場合は当リポジトリのIssuesから連絡できます。

## Chrome拡張機能

YouTube上で `ネタバレ防止言語:` を含むコメントやライブチャットを自動復号し、復号した文字を色付きで表示します。ポップアップから暗号化もでき、送信先・送信内容を再確認する送信機能も備えています。

**[最新版の拡張機能をダウンロード（GitHub Releases）](https://github.com/zero-lily/Re-Cipher/releases/latest)**

Releasesの「Assets」にある **`Re-Cipher-Chrome-v*.zip`**（最新版は v1.1.6）をダウンロードしてください。

> **注意：** GitHubが自動表示する **`Source code (zip)`** はWebサイト等を含むリポジトリ全体のソースです。Chrome拡張のインストールには **`Re-Cipher-Chrome-v*.zip`** を使用してください。

### インストール方法（Windows・Chrome）

1. ダウンロードしたZIPを右クリックして「すべて展開」します。
2. Chromeのアドレス欄に `chrome://extensions` と入力します。
3. 右上の「デベロッパーモード」をオンにします。
4. 「パッケージ化されていない拡張機能を読み込む」を押します。
5. ZIPを展開したフォルダ（`manifest.json` が直接入っている場所）を指定します。
6. YouTubeのページを再読み込みし、拡張機能のアイコンから「自動復号」をオンにします。


### 更新について

新しい拡張機能がリリースされた場合は、新版ZIPをダウンロード・展開してChrome側で拡張機能を読み込み直してください。デベロッパーモードでインストールした拡張機能は、GitHub Releasesから自動更新されません。

復号辞書は [codec-v3.json](./codec-v3.json) を参照して更新できます。辞書の変更と拡張機能本体の更新は別です。

### 拡張機能でできること

- **自動復号**：新規インストール時はオン。YouTubeの `ネタバレ防止言語:` を復号し、接頭辞は紫、復号本文は緑で表示します。
- **投稿の非表示**：独立したスイッチで `ネタバレ防止言語:` のコメント・チャット全体を非表示にできます。
- **復号オフ時の色分け**：`ネタバレ防止言語:` は紫、未復号の暗号本文はオレンジで表示します。
- **手動の暗号化・復号**：拡張機能のポップアップ内でどちらも利用できます。
- **暗号化して送信**：送信先と内容を確認する二段階方式です。既存の下書きは上書きしません。

旧接頭辞の `Re信号:` で投稿した暗号文も、引き続き復号できます。新規投稿には `ネタバレ防止言語:` を使用します。

## 開発者向け

- [Chrome拡張機能のソース](./chrome-extension/)
- [最新リリース](https://github.com/zero-lily/Re-Cipher/releases/latest)
- [辞書データ](./codec-v3.json)

拡張機能のZIPには `chrome-extension/` 以下のファイルだけを入れます。リポジトリ全体を含めません。バージョンを更新して `main` に反映する際は、GitHub ActionsがZIPの作成とReleaseへの添付を行います。

## 注意事項

これは偶然ネタバレを見てしまうことを避けるための**難読化**です。暗号学的な秘匿性はなく、変換サイトを使えば誰でも復号できます。Re:Zeroの権利者とは関係のない非公式ファンツールです。

ブラウザ内で暗号化・復号し、コメント本文を変換サーバーへ送信しません。
