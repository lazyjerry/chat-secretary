CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_username TEXT UNIQUE NOT NULL,
  language TEXT DEFAULT 'zh-TW',
  timezone TEXT DEFAULT 'Asia/Taipei',
  registered_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  original_question TEXT NOT NULL,
  translated_question TEXT,
  rag_response TEXT,
  translated_response TEXT,
  intent TEXT,
  asked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  responded_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL UNIQUE,
  total_queries INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0.0,
  total_openai_tokens INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 插入 Google 翻譯計費設定
INSERT OR REPLACE INTO config (key, value) VALUES
('google_translation_pricing', '{"freeQuota":500000,"pricePerMillion":20}');

-- 插入 OpenAI 計費設定
INSERT OR REPLACE INTO config (key, value) VALUES
('openai_pricing', '{"freeQuota":0,"pricePerThousandTokens":0.03}');

CREATE TABLE IF NOT EXISTS whitelist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);