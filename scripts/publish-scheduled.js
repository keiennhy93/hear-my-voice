/**
 * 掃描 drafts/ 資料夾裡的文章草稿。
 * 每個草稿檔案最上方要有一段 <!-- PUBLISH_META ... --> 註解，內容包含：
 *   PUBLISH_DATE: 2026-08-20          → 預定發布日期（YYYY-MM-DD，馬來西亞時間）
 *   PUBLISH_TIME: 12:00               → 預定發布時間（HH:MM，24小時制，馬來西亞時間，可省略，預設 00:00）
 *   PUBLISH_FILENAME: article-xxx.html → 發布後在根目錄的檔名
 *   CARD_HTML:                         → 要插入 index.html 文章列表的整段 <a class="card">...</a>
 *
 * 到了發布日期與時間（或已經過期）：
 *   1. 把註解區塊從文章內容中移除
 *   2. 把文章存到 repo 根目錄（跟 index.html 同一層）
 *   3. 刪除 drafts/ 裡的草稿檔
 *   4. 把 CARD_HTML 插入 index.html 的 <div class="grid" id="article-grid"> 最前面（最新文章排最前面）
 *
 * 注意：GitHub Actions 的排程本身有 10-30 分鐘左右的誤差，不是精確到秒的鬧鐘，
 * 所以「中午12點發布」實際上線時間可能落在 12:00~12:30 之間。
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRAFTS_DIR = path.join(ROOT, 'drafts');
const INDEX_PATH = path.join(ROOT, 'index.html');

// 用馬來西亞時間（UTC+8）判斷「現在」，避免跟 GitHub Actions 的 UTC 時間搞混
function nowInMalaysia() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 8 * 60 * 60000);
}

function extractMeta(content) {
  const match = content.match(/<!--\s*PUBLISH_META([\s\S]*?)-->/);
  if (!match) return null;

  const block = match[1];
  const dateMatch = block.match(/PUBLISH_DATE:\s*(\d{4}-\d{2}-\d{2})/);
  const timeMatch = block.match(/PUBLISH_TIME:\s*(\d{2}:\d{2})/);
  const filenameMatch = block.match(/PUBLISH_FILENAME:\s*(\S+)/);
  const cardMatch = block.match(/CARD_HTML:\s*([\s\S]*)/);

  if (!dateMatch || !filenameMatch || !cardMatch) return null;

  const time = timeMatch ? timeMatch[1] : '00:00';
  const publishAt = new Date(`${dateMatch[1]}T${time}:00+08:00`);

  return {
    fullMatch: match[0],
    publishAt,
    date: dateMatch[1],
    time,
    filename: filenameMatch[1].trim(),
    cardHtml: cardMatch[1].trim(),
  };
}

function insertCardIntoIndex(cardHtml) {
  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const gridMarker = '<div class="grid" id="article-grid">';
  const idx = indexHtml.indexOf(gridMarker);

  if (idx === -1) {
    throw new Error('在 index.html 裡找不到 <div class="grid" id="article-grid">，請確認結構是否有變動。');
  }

  const insertAt = idx + gridMarker.length;
  indexHtml =
    indexHtml.slice(0, insertAt) +
    '\n\n    ' + cardHtml + '\n' +
    indexHtml.slice(insertAt);

  fs.writeFileSync(INDEX_PATH, indexHtml, 'utf8');
}

function publishArticle(draftPath, meta, content) {
  const cleaned = content.replace(meta.fullMatch, '').replace(/^\s+/, '');
  const targetPath = path.join(ROOT, meta.filename);

  fs.writeFileSync(targetPath, cleaned, 'utf8');
  fs.unlinkSync(draftPath);
  insertCardIntoIndex(meta.cardHtml);

  console.log(`已發布：${meta.filename}（預定 ${meta.date} ${meta.time}）`);
}

function main() {
  if (!fs.existsSync(DRAFTS_DIR)) {
    console.log('沒有 drafts 資料夾，略過。');
    return;
  }

  const now = nowInMalaysia();
  const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.html'));

  if (files.length === 0) {
    console.log('drafts 資料夾目前是空的。');
    return;
  }

  let publishedCount = 0;

  files.forEach(file => {
    const draftPath = path.join(DRAFTS_DIR, file);
    const content = fs.readFileSync(draftPath, 'utf8');
    const meta = extractMeta(content);

    if (!meta) {
      console.warn(`跳過 ${file}：找不到有效的 PUBLISH_META 區塊，請檢查格式。`);
      return;
    }

    if (meta.publishAt <= now) {
      publishArticle(draftPath, meta, content);
      publishedCount++;
    } else {
      console.log(`${file} 預定 ${meta.date} ${meta.time} 發布，尚未到期`);
    }
  });

  if (publishedCount === 0) {
    console.log('現在沒有需要發布的文章。');
  }
}

main();
