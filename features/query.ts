import "server-only"

import { streamText } from "ai"

import {
  getConversation,
  updateConversation,
  ConversationError,
  type Conversation,
} from "@/features/conversations"
import { createMessage, type Message } from "@/features/messages"
import { getChatModel } from "@/features/model"
import { embedText, EmbeddingError } from "@/lib/embeddings"
import {
  retrieveSimilar,
  VectorStoreError,
  type RetrievedChunk,
} from "@/lib/vector-store"

export type QueryErrorCode =
  | "invalid_input"
  | "not_found"
  | "forbidden"
  | "generation_failed"
  | "db_error"

export class QueryError extends Error {
  readonly code: QueryErrorCode

  constructor(
    code: QueryErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "QueryError"
    this.code = code
  }
}

export type QueryInput = {
  userId: string
  conversationId: string
  message: string
  limit?: number
}

export type QueryCitation = {
  id: string
  index: number
  filename: string
  kind: string
  score: number | null
  excerpt: string
}

export type QueryResult = {
  conversationId: string
  userMessage: Message
  assistantMessage: Message
  citations: QueryCitation[]
}

export type QueryStreamStatus = "thinking" | "retrieving" | "generating"

export type QueryStreamEvent =
  | { type: "status"; status: QueryStreamStatus }
  | {
      type: "user_message"
      message: {
        id: string
        conversationId: string
        role: string
        status: string
        content: string
        createdAt: string
      }
    }
  | { type: "citations"; citations: QueryCitation[] }
  | { type: "delta"; text: string }
  | {
      type: "done"
      assistantMessage: {
        id: string
        conversationId: string
        role: string
        status: string
        content: string
        createdAt: string
      }
      citations: QueryCitation[]
    }

const DEFAULT_RETRIEVAL_LIMIT = 5
const MAX_EXCERPT_CHARS = 280

function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new QueryError("invalid_input", `${field} must not be empty.`)
  }
  return trimmed
}

function toPublicMessage(message: Message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    status: message.status,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }
}

function toCitation(chunk: RetrievedChunk): QueryCitation {
  const excerpt =
    chunk.text.length > MAX_EXCERPT_CHARS
      ? `${chunk.text.slice(0, MAX_EXCERPT_CHARS).trimEnd()}…`
      : chunk.text

  return {
    id: chunk.id,
    index: chunk.index,
    filename: chunk.filename,
    kind: chunk.kind,
    score: chunk.score ?? null,
    excerpt,
  }
}

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant source passages were found."
  }

  return chunks
    .map((chunk, i) => {
      const score =
        chunk.score == null ? "" : ` (score: ${chunk.score.toFixed(3)})`
      return `[${i + 1}] ${chunk.filename}${score}\n${chunk.text}`
    })
    .join("\n\n")
}

function buildSystemPrompt(context: string): string {
  return [
    "You are Paper Pulse, an assistant that answers questions using only the provided source context.",
    "If the context does not contain enough information, say you do not know based on the indexed sources.",
    "Be concise and cite passage numbers like [1] when you use them.",
    "",
    "Source context:",
    context,
  ].join("\n")
}

async function loadOwnedConversation(
  conversationId: string,
  userId: string
): Promise<Conversation> {
  let conversation: Conversation
  try {
    conversation = await getConversation(conversationId)
  } catch (error) {
    if (error instanceof ConversationError && error.code === "not_found") {
      throw new QueryError(
        "not_found",
        `Conversation "${conversationId}" was not found.`,
        { cause: error }
      )
    }
    throw new QueryError("db_error", "Failed to load conversation.", {
      cause: error,
    })
  }

  if (conversation.userId !== userId) {
    throw new QueryError(
      "forbidden",
      `Conversation "${conversationId}" was not found.`
    )
  }

  return conversation
}

export async function* streamAnswerQuery(
  input: QueryInput
): AsyncGenerator<QueryStreamEvent> {
  const userId = assertNonEmpty(input.userId, "userId")
  const conversationId = assertNonEmpty(input.conversationId, "conversationId")
  const message = assertNonEmpty(input.message, "message")
  const limit = input.limit ?? DEFAULT_RETRIEVAL_LIMIT

  if (limit < 1 || limit > 20) {
    throw new QueryError("invalid_input", "limit must be between 1 and 20.")
  }

  yield { type: "status", status: "thinking" }

  const conversation = await loadOwnedConversation(conversationId, userId)

  const userMessage = await createMessage({
    conversationId,
    role: "USER",
    status: "COMPLETED",
    content: message,
  })

  yield {
    type: "user_message",
    message: toPublicMessage(userMessage),
  }

  yield { type: "status", status: "retrieving" }

  let chunks: RetrievedChunk[]
  try {
    const [queryChunk] = await embedText(message)
    if (!queryChunk) {
      throw new QueryError("invalid_input", "Failed to embed the query.")
    }

    chunks = await retrieveSimilar({
      embedding: queryChunk.embedding,
      limit,
      filter: { conversationId },
    })
  } catch (error) {
    if (error instanceof QueryError) throw error
    if (error instanceof EmbeddingError || error instanceof VectorStoreError) {
      throw error
    }
    throw new QueryError("db_error", "Failed to retrieve source context.", {
      cause: error,
    })
  }

  const citations = chunks.map(toCitation)
  yield { type: "citations", citations }

  yield { type: "status", status: "generating" }

  let answerText = ""
  try {
    const result = streamText({
      model: getChatModel(conversation.model),
      system: buildSystemPrompt(buildContext(chunks)),
      prompt: message,
    })

    for await (const delta of result.textStream) {
      if (!delta) continue
      answerText += delta
      yield { type: "delta", text: delta }
    }

    answerText = answerText.trim()
    if (!answerText) {
      throw new QueryError(
        "generation_failed",
        "The model returned an empty response."
      )
    }
  } catch (error) {
    if (error instanceof QueryError) throw error
    throw new QueryError(
      "generation_failed",
      "Failed to generate an answer from the model.",
      { cause: error }
    )
  }

  const assistantMessage = await createMessage({
    conversationId,
    role: "ASSISTANT",
    status: "COMPLETED",
    content: answerText,
    metadata: {
      citations,
    },
    parentMessageId: userMessage.id,
  })

  await updateConversation(conversationId, {
    lastMessageAt: assistantMessage.createdAt,
  })

  yield {
    type: "done",
    assistantMessage: toPublicMessage(assistantMessage),
    citations,
  }
}

export async function answerQuery(input: QueryInput): Promise<QueryResult> {
  let userMessage: Message | null = null
  let assistantMessage: Message | null = null
  let citations: QueryCitation[] = []
  let streamedText = ""

  for await (const event of streamAnswerQuery(input)) {
    if (event.type === "user_message") {
      userMessage = {
        id: event.message.id,
        conversationId: event.message.conversationId,
        role: event.message.role as Message["role"],
        status: event.message.status as Message["status"],
        content: event.message.content,
        parts: null,
        metadata: null,
        parentMessageId: null,
        createdAt: new Date(event.message.createdAt),
        updatedAt: new Date(event.message.createdAt),
      }
    }
    if (event.type === "citations") {
      citations = event.citations
    }
    if (event.type === "delta") {
      streamedText += event.text
    }
    if (event.type === "done") {
      assistantMessage = {
        id: event.assistantMessage.id,
        conversationId: event.assistantMessage.conversationId,
        role: event.assistantMessage.role as Message["role"],
        status: event.assistantMessage.status as Message["status"],
        content: event.assistantMessage.content,
        parts: null,
        metadata: { citations: event.citations },
        parentMessageId: userMessage?.id ?? null,
        createdAt: new Date(event.assistantMessage.createdAt),
        updatedAt: new Date(event.assistantMessage.createdAt),
      }
      citations = event.citations
    }
  }

  if (!userMessage || !assistantMessage) {
    throw new QueryError(
      "generation_failed",
      streamedText
        ? "Stream finished without a complete assistant message."
        : "Stream finished without messages."
    )
  }

  return {
    conversationId: input.conversationId,
    userMessage,
    assistantMessage,
    citations,
  }
}
