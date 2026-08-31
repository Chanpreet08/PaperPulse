import type {
  PulseMessage,
  PulseMessageRole,
  PulseMessageStatus,
} from "@/components/pulse/types"

export type QueryCitation = {
  id: string
  index: number
  filename: string
  kind: string
  score: number | null
  excerpt: string
}

export type QueryStreamStatus = "thinking" | "retrieving" | "generating"

export type QueryStreamEvent =
  | { type: "status"; status: QueryStreamStatus }
  | { type: "user_message"; message: PulseMessage }
  | { type: "citations"; citations: QueryCitation[] }
  | { type: "delta"; text: string }
  | {
      type: "done"
      assistantMessage: PulseMessage
      citations: QueryCitation[]
    }
  | { type: "error"; error: string }

export type AskConversationHandlers = {
  onStatus?: (status: QueryStreamStatus) => void
  onUserMessage?: (message: PulseMessage) => void
  onCitations?: (citations: QueryCitation[]) => void
  onDelta?: (text: string) => void
  onDone?: (result: {
    assistantMessage: PulseMessage
    citations: QueryCitation[]
  }) => void
}

function normalizeMessage(message: {
  id: string
  conversationId: string
  role: string
  status: string
  content: string
  createdAt: string
}): PulseMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as PulseMessageRole,
    status: message.status as PulseMessageStatus,
    content: message.content,
    createdAt: message.createdAt,
  }
}

function parseEvent(line: string): QueryStreamEvent | null {
  if (!line.trim()) return null

  const event = JSON.parse(line) as QueryStreamEvent
  if (event.type === "user_message") {
    return {
      type: "user_message",
      message: normalizeMessage(event.message),
    }
  }
  if (event.type === "done") {
    return {
      type: "done",
      assistantMessage: normalizeMessage(event.assistantMessage),
      citations: event.citations ?? [],
    }
  }
  return event
}

export async function askConversation(
  input: { conversationId: string; message: string },
  handlers: AskConversationHandlers = {}
): Promise<{
  userMessage: PulseMessage
  assistantMessage: PulseMessage
  citations: QueryCitation[]
}> {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(payload?.error || "Failed to answer query.")
  }

  if (!response.body) {
    throw new Error("Query response did not include a stream body.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let userMessage: PulseMessage | null = null
  let assistantMessage: PulseMessage | null = null
  let citations: QueryCitation[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      let event: QueryStreamEvent | null
      try {
        event = parseEvent(line)
      } catch {
        throw new Error("Failed to parse streamed query event.")
      }
      if (!event) continue

      if (event.type === "error") {
        throw new Error(event.error)
      }
      if (event.type === "status") {
        handlers.onStatus?.(event.status)
      }
      if (event.type === "user_message") {
        userMessage = event.message
        handlers.onUserMessage?.(event.message)
      }
      if (event.type === "citations") {
        citations = event.citations
        handlers.onCitations?.(event.citations)
      }
      if (event.type === "delta") {
        handlers.onDelta?.(event.text)
      }
      if (event.type === "done") {
        assistantMessage = event.assistantMessage
        citations = event.citations
        handlers.onDone?.({
          assistantMessage: event.assistantMessage,
          citations: event.citations,
        })
      }
    }
  }

  if (buffer.trim()) {
    const event = parseEvent(buffer)
    if (event?.type === "error") {
      throw new Error(event.error)
    }
    if (event?.type === "done") {
      assistantMessage = event.assistantMessage
      citations = event.citations
      handlers.onDone?.({
        assistantMessage: event.assistantMessage,
        citations: event.citations,
      })
    }
  }

  if (!userMessage || !assistantMessage) {
    throw new Error("Stream ended before the answer completed.")
  }

  return { userMessage, assistantMessage, citations }
}
