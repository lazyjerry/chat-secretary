import type { Env } from './types'

export async function queryAutoRAG(query: string, env: Env): Promise<string | null> {
  if (!env.AI) {
    throw new Error('AI binding is not configured')
  }

  const dbName: string = env.AUTO_RAG_DB_NAME
  // const dbName: string = "soft-base-6cc6" // 使用預設的資料庫名稱，或從環境變數中取得

  try {
    const response = await env.AI.autorag(dbName).aiSearch({
      query,
    })
    
    if (response?.response) {
      return response.response as string
    }
    return null
  } catch (error) {
    console.error('AutoRAG 查詢錯誤:', error)
    return null
  }
}