import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

import { ConversationError } from "@/features/conversations"
import { MessageError } from "@/features/messages"
import {
  QueryError,
  streamAnswerQuery,
  type QueryStreamEvent,
} from "@/features/query"
import { getUser, UserError } from "@/features/users"
import { EmbeddingError } from "@/lib/embeddings"
import { VectorStoreError } from "@/lib/vector-store"

export const maxDuration = 120

function errorPayload(error: unknown): { error: string; status: number } {
  if (error instanceof UserError) {
    switch (error.code) {
      case "invalid_input":
        return { error: error.message, status: 400 }
      case "not_found":
        return { error: error.message, status: 404 }
      case "conflict":
        return { error: error.message, status: 409 }
      case "db_error":
        return { error: error.message, status: 500 }
    }
  }

  if (error instanceof QueryError) {
    switch (error.code) {
      case "invalid_input":
        return { error: error.message, status: 400 }
      case "not_found":
      case "forbidden":
        return { error: error.message, status: 404 }
      case "generation_failed":
      case "db_error":
        return { error: error.message, status: 500 }
    }
  }

  if (error instanceof ConversationError || error instanceof MessageError) {
    switch (error.code) {
      case "invalid_input":
        return { error: error.message, status: 400 }
      case "not_found":
        return { error: error.message, status: 404 }
      case "db_error":
        return { error: error.message, status: 500 }
    }
  }

  if (error instanceof EmbeddingError) {
    switch (error.code) {
      case "empty_text":
        return { error: error.message, status: 422 }
      case "missing_api_key":
        return { error: error.message, status: 503 }
      case "embed_failed":
        return { error: error.message, status: 500 }
    }
  }

  if (error instanceof VectorStoreError) {
    switch (error.code) {
      case "empty_chunks":
      case "invalid_vector":
        return { error: error.message, status: 422 }
      case "invalid_query":
        return { error: error.message, status: 400 }
      case "missing_config":
        return { error: error.message, status: 503 }
    }
  }

  const message =
    error instanceof Error ? error.message : "Internal server error."
  return { error: message, status: 500 }
}

export async function POST(request: Request): Promise<Response> {
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const clerkUser = await currentUser()
  if (!clerkUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email =
    clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress

  if (!email) {
    return NextResponse.json(
      { error: "Authenticated user has no email address." },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON." },
      { status: 400 }
    )
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    )
  }

  const { conversationId, message, limit } = body as {
    conversationId?: unknown
    message?: unknown
    limit?: unknown
  }

  if (typeof conversationId !== "string" || typeof message !== "string") {
    return NextResponse.json(
      { error: "conversationId and message are required strings." },
      { status: 400 }
    )
  }

  if (
    limit !== undefined &&
    (typeof limit !== "number" || !Number.isInteger(limit))
  ) {
    return NextResponse.json(
      { error: "limit must be an integer when provided." },
      { status: 400 }
    )
  }

  let userId: string
  try {
    const user = await getUser({ email })
    userId = user.id
  } catch (error) {
    const payload = errorPayload(error)
    return NextResponse.json(
      { error: payload.error },
      { status: payload.status }
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: QueryStreamEvent | { type: "error"; error: string }) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      try {
        for await (const event of streamAnswerQuery({
          userId,
          conversationId,
          message,
          limit,
        })) {
          send(event)
        }
      } catch (error) {
        const payload = errorPayload(error)
        send({ type: "error", error: payload.error })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
