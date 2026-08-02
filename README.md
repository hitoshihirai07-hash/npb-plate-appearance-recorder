# NPB 打席記録

NPBの試合を対象に、打席結果・決着球の球種と球速・走者進塁・イニング別スコアを記録するブラウザアプリです。

入力した試合はブラウザ内に保存され、打席記録をCSVで出力できます。

## ローカル起動

```bash
npm ci
npm run dev
```

## Cloudflare Pages設定

GitHubへこのフォルダー内のファイルをアップロードし、Cloudflare Pagesでリポジトリを接続します。

- Production branch: `main`
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: 空欄

Node.jsは`.node-version`で`22.16.0`に固定しています。

## データについて

選手マスターと成績CSVはアプリのビルドに必要です。試合中に入力したデータはGitHubやCloudflareへ送信されず、利用中のブラウザ内に保存されます。
