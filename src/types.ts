import type { D1Database } from '@cloudflare/workers-types'

export interface Env {
  TELEGRAM_BOT_TOKEN: string      // Secret
  OPENAI_API_KEY: string          // Secret
  CHAT_SECRETARY_DB: D1Database   // D1 Database binding
  AI: {
    autorag: (name: string) => {
      aiSearch: (opts: { query: string }) => Promise<{
        response: any
      }>
    }
  }
  AUTO_RAG_DB_NAME: string
}