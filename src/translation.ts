import type { Env } from './types'   // 引入型別

/**
 * 將傳入的中文文字翻譯成英文。
 * 
 * 此函式使用 OpenAI GPT-4o-mini 進行翻譯。
 * 
 * @param text 要翻譯的中文文字
 * @param env 包含環境變數的物件，需包含 OPENAI_API_KEY
 * @returns 翻譯後的英文文字
 */
export async function translateToEnglish(text: string, env: Env): Promise<string> {
  return await translateByOpenAIEnglish(text, env)
}

/**
 * 將傳入的英文文字翻譯成使用者語言（預設為繁體中文）。
 * 
 * 此函式使用 OpenAI GPT-4o-mini 進行翻譯。
 * 
 * @param question 問題文字，用於上下文
 * @param text 要翻譯的英文文字
 * @param env 包含環境變數的物件，需包含 OPENAI_API_KEY
 * @returns 翻譯後的繁體中文文字
 */
export async function translateToUserLang(question: string, text: string, env: Env): Promise<string> {
    if (!env || !env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in env')
  }
  return await translateByOpenAIChinese(question, text, env)
}

/** 
 * 使用 OpenAI API 將中文翻譯成英文。
 */
async function translateByOpenAIEnglish(text: string, env: Env): Promise<string> {
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一個中文翻譯英文的助理。你會將內文整理成 AI 可閱讀的格式。' },
        { role: 'user', content: `請翻譯成英文：「${text}」` },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  })
  if (!openaiRes.ok) throw new Error('OpenAI Translation API error')
  const openaiJson = await openaiRes.json()
  const openaiText = openaiJson.choices?.[0]?.message?.content
  if (openaiText) return openaiText.trim()
  throw new Error('OpenAI Translation API no result')
}

/**
 * 使用 OpenAI API 將英文翻譯成中文。
 */
async function translateByOpenAIChinese(question: string, text: string, env: Env): Promise<string> {
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一個翻譯助手兼任資料整理大師，你將資訊依照原本問題，整理出最適合原本問題的答案，並且翻譯成中文。' },
        { role: 'user', content: `請整理資訊：「${text}」，原本問題是：「${question}」。` },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  })
  if (!openaiRes.ok) throw new Error('OpenAI Translation API error')
  const openaiJson = await openaiRes.json()
  const openaiText = openaiJson.choices?.[0]?.message?.content
  if (openaiText) return openaiText.trim()
  throw new Error('OpenAI Translation API no result')
}