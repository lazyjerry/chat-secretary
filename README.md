# Chat Secretary — 樂透小秘書

一個基於 Cloudflare Workers 與 OpenAI、AutoRAG 的 Telegram Bot，提供樂透彩相關查詢與即時答覆功能。

---

## 功能

- Telegram Bot 互動，支援樂透相關問題詢問。
- 自動判斷使用者輸入意圖（使用 AI intent detection）。
- 中文／英文翻譯（使用 OpenAI GPT-4o-mini）。
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

⸻

## 技術債 (Technical Debt)
1. Cloudflare Worker 執行速度與免費額度限制
- 免費版本的 Cloudflare Workers 及 D1 資料庫存在請求次數與運算時間限制。當流量高峰或複雜查詢時，可能會造成回應延遲或超時錯誤。
- 需評估升級付費方案或改用其他服務以提升穩定度與擴展性。
2. AutoRAG 向量資料庫的資料更新流程較為手動
- 當新增或更新樂透資料時，目前依賴手動上傳與重新索引。
- 可開發自動化資料同步機制或 CI/CD 流程，降低維護成本。
3. 錯誤處理與重試機制不足
- 當 OpenAI 或 AutoRAG API 請求失敗時，現行錯誤處理較簡單，缺少自動重試或回退機制。
- 建議加入更完善的錯誤重試策略與監控警報。
4. Token 統計與計費機制未完全自動化
- 目前 Token 計算依賴簡易估算，缺乏與 OpenAI 官方精確 token 計數同步。
- 計費設定需手動更新，無法動態調整免費額度與單價。
5. 時區與語言支援有限
- 現行系統時區固定為「Asia/Taipei」，未動態偵測用戶時區。
- 翻譯僅支援繁體中文與英文，未涵蓋其他使用者可能的語言。
6. 白名單管理及使用者權限控制較為基礎
- 缺少更細緻的權限層級與管理介面。
- 白名單資料表結構與查詢效能可優化。
7. 缺乏完整日誌與使用者行為追蹤
- 目前僅記錄基本動作與統計，缺少詳盡的請求日誌與性能分析。
8. 缺乏測試自動化與 CI/CD
- 專案尚未建立單元測試、整合測試與自動部署流程。
