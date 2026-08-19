# 排程發布使用說明

## 資料夾結構（放進你的 repo 根目錄，跟 index.html 同一層）

```
00 website/
├── index.html
├── article-datboirg.html
├── article-how1e.html
├── ...（其他已發布的文章）
├── drafts/                          ← 還沒公開的文章放這裡
│   ├── README.md                    ← 這份說明
│   └── article-byn.html             ← 範例草稿（byn，排定 2026-08-20 12:00 發布）
├── scripts/
│   └── publish-scheduled.js         ← 自動發布腳本
└── .github/
    └── workflows/
        └── scheduled-publish.yml    ← 每天自動觸發的排程設定
```

## 怎麼寫一篇「排程發布」的草稿

把寫好的文章整個 HTML 檔案放進 `drafts/` 資料夾，並在檔案最上方（`<!DOCTYPE html>` 之前）加一段這樣的註解：

```html
<!--
PUBLISH_META
PUBLISH_DATE: 2026-08-20
PUBLISH_TIME: 12:00
PUBLISH_FILENAME: article-byn.html
CARD_HTML:
<a class="card" href="article-byn.html"
   data-title="byn"
   data-tags="音樂推薦,馬來西亞,創作歌手">
  <span class="card-img-wrap">
    <img src="images/byn-1.jpg" alt="byn" loading="lazy" onerror="this.parentElement.style.display='none'">
  </span>
  <span class="issue-no">VOL.09 NO.01 — 2026.08.20</span>
  <span class="artist">byn</span>
  <span class="desc">搖滾只是人生的B-side</span>
  <span class="tags"><span>音樂推薦</span><span>馬來西亞</span><span>創作歌手</span></span>
</a>
-->
<!DOCTYPE html>
...（文章正文）
```

- `PUBLISH_DATE`：想要上線的日期（馬來西亞時間），格式 `YYYY-MM-DD`
- `PUBLISH_TIME`：想要上線的時間（馬來西亞時間，24小時制），格式 `HH:MM`。**可以省略**，省略時預設為當天 `00:00`
- `PUBLISH_FILENAME`：發布後在根目錄要用的檔名（通常跟現在的檔名一樣）
- `CARD_HTML`：把 index.html 裡那張文章卡片（`<a class="card">...</a>` 整段）貼進來 —— 直接照抄你平常手動加進 index.html 的格式即可

## 到期之後會自動做什麼

每天固定時間（預設 UTC 04:00，也就是馬來西亞時間中午 12 點），GitHub Actions 會執行 `scripts/publish-scheduled.js`：

1. 掃描 `drafts/` 裡所有 `.html` 檔案
2. 檢查 `PUBLISH_DATE` + `PUBLISH_TIME` 是否已到或已過期
3. 如果到期：
   - 把上面那段 `PUBLISH_META` 註解從文章內容移除
   - 把文章存到 repo 根目錄（跟 index.html 同一層），檔名用 `PUBLISH_FILENAME`
   - 從 `drafts/` 刪除草稿檔
   - 把 `CARD_HTML` 插入 `index.html` 文章列表的最前面（最新文章排最上面）
4. 全部處理完後自動 `git commit` + `git push`，GitHub Pages 就會重新部署，文章正式上線

如果時間還沒到，該篇文章會維持在 `drafts/` 裡，不會被公開存取（因為它不在網站根目錄，也沒有 index.html 連結指到它）。

**注意時間誤差**：GitHub Actions 的排程本身有 10-30 分鐘左右的延遲（尤其是整點附近負載高的時候），不是精確到秒的鬧鐘。設定「中午12點發布」，實際上線可能落在 12:00~12:30 之間，這是 GitHub 平台本身的限制，沒有辦法做到分秒不差。如果你的發布時間真的非常講究精確度，建議設定成比理想時間早一點（例如想 12:00 上線，設 `11:45`），或是接受有小幅度誤差。

## 手動測試

不想等排程時間到，可以到 GitHub repo 的 **Actions** 分頁 → 選 **Scheduled Publish** → 右上角 **Run workflow** 手動觸發一次，馬上看結果。

## 想改成別的時間執行

打開 `.github/workflows/scheduled-publish.yml`，把 `cron: '0 4 * * *'` 換成你要的時間（cron 都是 UTC 時間，記得跟馬來西亞時間相差 8 小時，例如馬來西亞 12:00 = UTC 04:00）。可以用 https://crontab.guru 產生對應字串。

如果你之後每篇文章的發布時間都差不多（例如都設中午12點），現在這個設定就不用再改，只要在每篇草稿裡改 `PUBLISH_DATE` 就好。如果不同文章的發布時間差很多，可以考慮把排程改成更頻繁執行（例如每小時一次：`cron: '0 * * * *'`），這樣不管設定哪個時間，最多也只會晚一小時內就發布。
