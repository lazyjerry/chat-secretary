import type { Env } from './types'

async function getConfigValue(env: Env, key: string): Promise<string | null> {
  const row = await env.CHAT_SECRETARY_DB.prepare('SELECT value FROM config WHERE key = ?').bind(key).first()
  return row ? row.value : null
}

function estimateOpenAITokens(text: string): number {
  // 粗略估計：每 4 字元約 1 token
  return Math.ceil(text.length / 4)
}

export async function logAction(
  env: Env,
  data: {
    username: string
    languageCode: string
    timezone: string
    question: string
    translatedQuestion: string
    ragAnswer: string | null
    translatedAnswer: string
    questionTime: string
    replyTime: string
    intent?: string
  }
): Promise<void> {
  console.log('[logAction] Start', { username: data.username })

  // 1. 先取得 user_id，若不存在就新增 users
  let user = await env.CHAT_SECRETARY_DB
    .prepare('SELECT id FROM users WHERE telegram_username = ?')
    .bind(data.username)
    .first()

  if (!user) {
    console.log('[logAction] User not found, inserting new user...')
    const insertUser = await env.CHAT_SECRETARY_DB
      .prepare(
        `INSERT INTO users (telegram_username, language, timezone, registered_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(data.username, data.languageCode, data.timezone, new Date().toISOString())
      .run()

    const lastInsertId = insertUser.lastInsertRowid
    if (!lastInsertId) {
      console.error('[logAction] 無法新增使用者資料')
      throw new Error('無法新增使用者資料')
    }
    user = { id: lastInsertId }
  }

  // 2. 計算 OpenAI token 數
  const openAITokenCount = estimateOpenAITokens(data.translatedQuestion + (data.ragAnswer ?? '') + data.translatedAnswer)

  // 3. 讀取 OpenAI 計費設定
  const openAIConfigStr = await getConfigValue(env, 'openai_pricing')

  const openAIConfig = openAIConfigStr ? JSON.parse(openAIConfigStr) : {
    freeQuota: 0,
    pricePerThousandTokens: 0.03,
  }

  // 4. 計算 OpenAI 費用
  const billableOpenAITokens = Math.max(0, openAITokenCount - openAIConfig.freeQuota)
  const openAICost = (billableOpenAITokens / 1000) * openAIConfig.pricePerThousandTokens

  const totalCost = openAICost

  // 5. 插入 actions 紀錄
  const actionSql = `
    INSERT INTO actions
      (user_id, original_question, translated_question, rag_response, translated_response, intent, asked_at, responded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  await env.CHAT_SECRETARY_DB
    .prepare(actionSql)
    .bind(
      user.id,
      data.question,
      data.translatedQuestion,
      data.ragAnswer,
      data.translatedAnswer,
      data.intent ?? null,
      data.questionTime,
      data.replyTime
    )
    .run()

  // 6. 更新全域 statistics 統計（依 month 聚合）
  const month = new Date(data.questionTime).toISOString().slice(0, 7)
  const now = new Date().toISOString()

  const statsSql = `
    INSERT INTO statistics (month, total_queries, total_cost, total_openai_tokens, updated_at)
    VALUES (?, 1, ?, ?, ?)
    ON CONFLICT(month) DO UPDATE SET
      total_queries = total_queries + 1,
      total_cost = total_cost + excluded.total_cost,
      total_openai_tokens = total_openai_tokens + excluded.total_openai_tokens,
      updated_at = excluded.updated_at
  `
  await env.CHAT_SECRETARY_DB
    .prepare(statsSql)
    .bind(month, totalCost, openAITokenCount, now)
    .run()

  console.log('[logAction] Action and global statistics recorded. Cost:', totalCost)
}