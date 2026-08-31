import "server-only"

import { createGoogleGenerativeAI, type GoogleProvider } from "@ai-sdk/google"
import { openai, type OpenAIProvider } from "@ai-sdk/openai"

export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "gemini-3.5-flash"
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const MODEL_PROVIDERS: Record<string, GoogleProvider | OpenAIProvider> = {
  GOOGLE: google,
  OPENAI: openai,
}

export function getChatModel(model?: string) {
  let modelToUse = DEFAULT_MODEL
  const modelProvider = process.env.MODEL_PROVIDER?.toUpperCase() || "GOOGLE"

  const provider = MODEL_PROVIDERS[modelProvider]
  if (model) {
    modelToUse = model
  }
  return provider(modelToUse)
}
