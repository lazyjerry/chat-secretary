import { logAction, updateStatistics } from './logAction'
import { Hono } from 'hono'
import type { Env } from './types'
import { detectIntent } from './detectIntent'
import { replyTelegram } from './reply'
import { queryAutoRAG } from './rag'
import { translateToEnglish, translateToUserLang } from './translation'

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => c.text('chat-secretary worker is running'))

app.post('/telegram-bot', async (c) => {
  const body = await c.req.json()
  console.log('[1] 收到請求:', JSON.stringify(body))

  const username = body.message?.from?.username
  const languageCode = body.message?.from?.language_code || 'zh-TW'
  const chatId = body.message?.chat?.id
  const text = body.message?.text
  const questionTime = new Date().toISOString()
  

  if (!username || !chatId || !text) {
    console.log('[2] 缺少必要訊息:', { username, chatId, text })
    return c.json({ ok: false, description: '缺少必要訊息' }, 400)
  }

  // 白名單檢查
  const count = await c.env.CHAT_SECRETARY_DB
    .prepare('SELECT count(id) AS count FROM whitelist WHERE id > 0')
    .first()
  console.log('[3] 白名單總數:', count)
  if (count && count.count > 0) {
    const res = await c.env.CHAT_SECRETARY_DB
      .prepare('SELECT id FROM whitelist WHERE username = ?')
      .bind(username)
      .first()
    console.log('[4] 白名單查詢結果:', res)
    if (!res || !res.id) {
      console.log('[5] 不在白名單:', username)
      await replyTelegram(c.env.TELEGRAM_BOT_TOKEN, chatId, '請先聯繫管理員註冊，要不然不給你用。')
      return c.json({ ok: true })
    }
  }

  // ------------
  // 檢查指令
  if (text.startsWith('/help')) {
    console.log('[6] 收到 /help 指令')
    const helpMessage = `歡迎使用樂透小秘書！\n\n` +
      `以下是可用的指令：\n` +
      `/start - 開始使用樂透小秘書\n` +
      `/statistics - 查看您的使用統計資料\n` +
      `\n請輸入您的樂透相關問題，例如：「台灣樂透開獎號碼」或「樂透中獎機率」等。`
    await replyTelegram(c.env.TELEGRAM_BOT_TOKEN, chatId, helpMessage)
    return c.json({ ok: true })
  }else if (text.startsWith('/start')) {
    // 如果 /start 則歡迎使用者
    console.log('[6] 收到 /start 指令')
    await replyTelegram(c.env.TELEGRAM_BOT_TOKEN, chatId, '歡迎使用樂透小秘書！')
    return c.json({ ok: true })
  }


  // 1. 判斷意圖
  let intent = 'unknown'
  let detectIntentTokenCount = 0
  try {
    intent = await detectIntent(text, c.env)
    console.log('[7] 判斷意圖:', intent)
    // 假設 detectIntent 回傳中帶有 token 數，請自行取得，否則可估算字數
    detectIntentTokenCount = Math.ceil(text.length / 4) // 簡單估計
  } catch (e) {
    console.log('[8] 判斷意圖失敗:', e)
  } finally {
    await updateStatistics(c.env, detectIntentTokenCount, questionTime)
  }

  if (intent !== 'lottery') {
    await replyTelegram(c.env.TELEGRAM_BOT_TOKEN, chatId, '我聽不懂你的意思。我只負責樂透彩相關查詢功能')
    return c.json({ ok: true })
  }

  // 翻譯成英文
  let translatedQuestion = ''
  let translateToEnglishTokenCount = 0
  try {
    translatedQuestion = await translateToEnglish(text, c.env)
    console.log('[10] 翻譯成英文:', translatedQuestion)
    translateToEnglishTokenCount = Math.ceil(translatedQuestion.length / 4)
  } catch (e) {
    console.log('[11] 翻譯失敗:', e)
    await replyTelegram(c.env.TELEGRAM_BOT_TOKEN, chatId, '翻譯失敗，請稍後再試。')
    return c.json({ ok: true })
  } finally {
    await updateStatistics(c.env, translateToEnglishTokenCount, questionTime)
  }

  // 呼叫 AutoRAG 查詢
  let ragAnswer = null
  let ragTokenCount = 0
  try {
    ragAnswer = await queryAutoRAG(translatedQuestion, c.env)
    console.log('[12] AutoRAG 查詢結果:', ragAnswer)
    ragTokenCount = ragAnswer ? Math.ceil(ragAnswer.length / 4) : 0
  } catch (e) {
    console.log('[12] AutoRAG 查詢錯誤:', e)
  } finally {
    await updateStatistics(c.env, ragTokenCount, questionTime)
  }

  if (!ragAnswer) {
    await replyTelegram(c.env.TELEGRAM_BOT_TOKEN, chatId, '目前查詢不到資料')
    return c.json({ ok: true })
  }

  // 翻譯回使用者語言
  let translatedAnswer = ''
  let translateToUserLangTokenCount = 0
  try {
    translatedAnswer = await translateToUserLang(text, ragAnswer, c.env)
    console.log('[14] 翻譯回使用者語言:', translatedAnswer)
    translateToUserLangTokenCount = Math.ceil(translatedAnswer.length / 4)
  } catch (e) {
    console.log('[15] 翻譯回使用者語言失敗:', e)
    translatedAnswer = ragAnswer + '\n\n（翻譯失敗，請聯繫管理員）'
  }
  // 這邊不用更新統計資料，因為一定會在最後執行

  // 紀錄動作（包含完整資訊）
  try {
    await logAction(c.env, {
      username,
      languageCode,
      timezone: 'Asia/Taipei',
      question: text,
      translatedQuestion,
      ragAnswer,
      translatedAnswer,
      questionTime,
      replyTime: new Date().toISOString(),
      intent,
    })
    console.log('[16] 動作已紀錄')
  } catch (e) {
    console.log('[17] 動作紀錄失敗:', e)
  }

  // 回覆 Telegram
  await replyTelegram(c.env.TELEGRAM_BOT_TOKEN, chatId, translatedAnswer)
  console.log('[18] 已回覆 Telegram:', translatedAnswer)

  return c.json({ ok: true })
})

export default app