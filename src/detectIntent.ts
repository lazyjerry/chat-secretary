import type { Env } from './types'

export async function detectIntent(text: string, env: Env): Promise<'lottery' | 'unknown'> {
  const prompt = `判斷以下問題是否為查詢「台灣樂透」相關內容？請回覆 'lottery' 或 'unknown'。\n問題：${text}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 5,
    }),
  })

  if (!res.ok) throw new Error('OpenAI intent detection error')

  const json = await res.json()
  const intent = json.choices?.[0]?.message?.content.trim().toLowerCase()

  if (intent === 'lottery') return 'lottery'
  return 'unknown'
}