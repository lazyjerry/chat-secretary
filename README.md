# Chat Secretary — 樂透小秘書

一個基於 Cloudflare Workers 與 OpenAI、AutoRAG 的 Telegram Bot，提供樂透彩相關查詢與即時答覆功能。

---

## 功能

- Telegram Bot 互動，支援樂透相關問題詢問。
- 自動判斷使用者輸入意圖（使用 AI intent detection）。
- 中文／英文翻譯（使用 OpenAI GPT-4o-mini，全面替代 Google 翻譯）。
- 利用 Cloudflare AutoRAG 查詢樂透彩歷史資料庫，快速回覆查詢。
- 針對查詢結果自動翻譯回使用者語言（預設繁體中文）。
- 動作紀錄與使用統計，包含每月查詢次數與 OpenAI Token 用量。
- 支援白名單管理，限制可使用者範圍。
- 指令支援：`/start`、`/help` 等。

---

## 技術棧

- **Cloudflare Workers** (使用 Hono 框架)
- **Cloudflare D1** 作為 SQLite 資料庫
- **Cloudflare KV** 儲存設定與快取（可選）
- **Cloudflare AutoRAG** 向量資料庫與 AI 問答
- **OpenAI GPT-4o-mini** 用於翻譯與自然語言理解
- **Telegram Bot API** 作為使用者互動介面
- TypeScript + Node.js 生態開發

---

## 檔案目錄結構

```bash
chat-secretary/
├─ src/
│  ├─ index.ts              # 主要 Worker 程式入口，包含 Telegram Webhook 處理邏輯
│  ├─ logAction.ts          # 動作紀錄與統計功能
│  ├─ translation.ts        # 翻譯相關函式
│  ├─ rag.ts                # AutoRAG 查詢邏輯
│  ├─ detectIntent.ts       # 意圖判斷邏輯
│  ├─ reply.ts              # 回覆 Telegram 的 API 呼叫封裝
│  └─ types.ts              # TypeScript 型別定義
├─ init.sql                 # 資料表初始化 SQL 腳本
├─ wrangler.toml            # Wrangler 專案設定檔
├─ README.md                # 專案說明文件

```
---

## 事前準備

### 1. 建立 Cloudflare 帳號與環境

- 註冊並登入 Cloudflare 帳號。
- 使用 Wrangler CLI 建立 Cloudflare Workers 專案。
- 啟用並建立 D1 資料庫，並準備好 `init.sql` 作為資料表初始化腳本。
- 部署並設定 Cloudflare AutoRAG，建立樂透彩相關的向量資料庫（例如「soft-base-6cc6」）。
- 在 Wrangler 專案中綁定 AutoRAG 服務。

### 2. Telegram Bot 建立與設定

- 使用 [BotFather](https://t.me/BotFather) 建立新的 Telegram Bot，取得 Bot Token。
- 透過 Telegram API 設定 Webhook，指向 Cloudflare Worker 的 `/telegram-bot` 端點。
```bash
  curl -F "url=https://YOUR_WORKER_URL/telegram-bot" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```
### 3. 申請 OpenAI API 金鑰
- 到 OpenAI 官方網站 申請 API 金鑰。
- 確保支援 GPT-4o-mini 模型。

### 4. 初始化 D1 資料庫
- 使用 Wrangler CLI 建立 D1 資料庫並執行初始化 SQL 腳本：

```bash
wrangler d1 create chat_secretary
wrangler d1 execute <DATABASE_ID> --file=init.sql
```

### 5. 設定 Worker 環境變數

使用 Wrangler CLI 設定必要的 Secrets：
```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put OPENAI_API_KEY
wrangler secret put AUTO_RAG_DB_NAME  # 例如 soft-base-6cc6
```

⸻

## Cloudflare AutoRAG 資料添加步驟
1.	進入 Cloudflare AI 平台
登入 Cloudflare Dashboard，並前往「AI」服務頁面。
2.	建立或選擇向量資料庫（Vector Database）
建立新的向量資料庫（例如命名為 soft-base-6cc6），此名稱需與 Worker 綁定時的 AUTO_RAG_DB_NAME 對應。
3.	準備樂透彩資料檔案
將樂透彩歷史資料整理成純文字格式或 CSV 檔案（可包含開獎日期、號碼、獎項等欄位），確保資料格式乾淨且結構一致。
4.	上傳資料並建立向量索引
透過 Cloudflare AI 平台提供的介面或 API，將樂透彩文字資料批次上傳。平台會自動將文字資料切分成向量（embedding），並建立索引以供快速搜尋。
5.	測試資料是否成功加入
在 Cloudflare AI Playground 或透過您 Worker 的 AutoRAG 呼叫接口，使用測試查詢（例如「5 月份大樂透號碼」）驗證資料是否能正確回應。
6.	定期更新與維護
根據需求新增或更新資料，並重新建立索引確保向量庫資料完整與正確。

### 補充說明
- 向量資料庫名稱必須與 Worker 端綁定的 AUTO_RAG_DB_NAME 一致，否則無法成功呼叫。
- AutoRAG 平台會依據文本相似度與上下文提供最佳回答，請確保上傳資料的品質與格式正確。
- 目前 Cloudflare AutoRAG 支援多種文件格式，請參考官方文件了解詳細支援清單。

⸻

## 部署步驟
1. 編輯並確認 src/index.ts 及其他程式碼，確保環境變數與綁定正確。
2. 使用 Wrangler CLI 部署 Worker：
```bash
wrangler deploy
```

3. 測試 Telegram Bot

- 在 Telegram 直接發送樂透相關問題，確認 Bot 能正常回覆。

⸻

## 開發注意事項
- 全面使用 OpenAI GPT-4o-mini 進行翻譯與意圖判斷，已移除 Google 翻譯相關功能。
- 使用 logAction 與 updateStatistics 函式分別記錄使用動作與累積 Token 使用數據。
- 可根據需求擴充白名單管理、多語系支援等功能。
- 請妥善保管環境變數，避免將 Secret 資訊寫入程式碼中或公開。

⸻

## 授權條款

本專案採用 MIT License

⸻

## 參考資源

- [Cloudflare Workers 官方文件](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 官方文件](https://developers.cloudflare.com/d1/)
- [Cloudflare AutoRAG 服務](https://developers.cloudflare.com/ai/)
- [OpenAI API](https://platform.openai.com/docs/)
- [Telegram Bot API](https://core.telegram.org/bots/api)



歡迎參考專案代碼，提出 Issue 與 Pull Request，一起完善樂透小秘書！
