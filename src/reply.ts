/**
 * 使用 Telegram Bot API 發送訊息到指定的 Telegram 聊天。
 *
 * @param botToken - Telegram 機器人的 Token。
 * @param chatId - 目標聊天的唯一識別碼。
 * @param text - 要發送的訊息內容。
 * @returns 傳回一個 Promise，當訊息發送完成時解析。
 */
export async function replyTelegram(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  })
}