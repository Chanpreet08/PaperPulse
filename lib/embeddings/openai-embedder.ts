import OpenAI from "openai"

import { EMBED_BATCH_SIZE } from "./types"

export async function embedChunks(
  chunks: string[],
  model: string,
  apiKey: string
): Promise<number[][]> {
  const client = new OpenAI({ apiKey })
  const embeddings: number[][] = []

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE)
    const response = await client.embeddings.create({
      model,
      input: batch,
    })
    const ordered = [...response.data].sort((a, b) => a.index - b.index)
    embeddings.push(...ordered.map((item) => item.embedding))
  }

  return embeddings
}
