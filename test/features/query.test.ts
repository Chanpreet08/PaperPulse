import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"

import * as conversations from "@/features/conversations"
import * as messages from "@/features/messages"
import * as model from "@/features/model"
import * as embeddings from "@/lib/embeddings"
import * as vectorStore from "@/lib/vector-store"
import type { Conversation, Message } from "@/lib/generated/prisma/client"

const streamTextMock = mock((_args: unknown) => ({
  textStream: (async function* () {
    yield "Based on [1], "
    yield "the answer is 42."
  })(),
}))

mock.module("ai", () => ({
  streamText: streamTextMock,
}))

const { answerQuery, QueryError, streamAnswerQuery } = await import(
  "@/features/query"
)

const sampleConversation: Conversation = {
  id: "01900000-0000-7000-8000-000000000020",
  userId: "01900000-0000-7000-8000-000000000001",
  title: "paper.pdf",
  model: "gemini-3.5-flash",
  systemPrompt: null,
  isPinned: false,
  isArchived: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastMessageAt: new Date("2026-01-01T00:00:00.000Z"),
}

const userMessage: Message = {
  id: "01900000-0000-7000-8000-000000000031",
  conversationId: sampleConversation.id,
  role: "USER",
  status: "COMPLETED",
  content: "What is the answer?",
  parts: null,
  metadata: null,
  parentMessageId: null,
  createdAt: new Date("2026-01-01T00:01:00.000Z"),
  updatedAt: new Date("2026-01-01T00:01:00.000Z"),
}

const assistantMessage: Message = {
  id: "01900000-0000-7000-8000-000000000032",
  conversationId: sampleConversation.id,
  role: "ASSISTANT",
  status: "COMPLETED",
  content: "Based on [1], the answer is 42.",
  parts: null,
  metadata: { citations: [] },
  parentMessageId: userMessage.id,
  createdAt: new Date("2026-01-01T00:01:01.000Z"),
  updatedAt: new Date("2026-01-01T00:01:01.000Z"),
}

const spies: Array<ReturnType<typeof spyOn>> = []

afterEach(() => {
  for (const restore of spies.splice(0)) {
    restore.mockRestore()
  }
  streamTextMock.mockClear()
})

function mockHappyPath() {
  spies.push(
    spyOn(conversations, "getConversation").mockResolvedValue(
      sampleConversation
    ),
    spyOn(messages, "createMessage")
      .mockResolvedValueOnce(userMessage)
      .mockResolvedValueOnce(assistantMessage),
    spyOn(conversations, "updateConversation").mockResolvedValue({
      ...sampleConversation,
      lastMessageAt: assistantMessage.createdAt,
    }),
    spyOn(embeddings, "embedText").mockResolvedValue([
      {
        index: 0,
        text: "What is the answer?",
        embedding: [0.1, 0.2, 0.3],
      },
    ]),
    spyOn(vectorStore, "retrieveSimilar").mockResolvedValue([
      {
        id: "chunk-1",
        index: 0,
        text: "The answer is forty-two.",
        filename: "paper.pdf",
        kind: "pdf",
        score: 0.91,
        embedding: [],
      },
    ]),
    spyOn(model, "getChatModel").mockReturnValue("mock-model" as never)
  )
}

describe("streamAnswerQuery", () => {
  test("streams status, deltas, and done events", async () => {
    mockHappyPath()

    const events = []
    for await (const event of streamAnswerQuery({
      userId: sampleConversation.userId,
      conversationId: sampleConversation.id,
      message: " What is the answer? ",
    })) {
      events.push(event)
    }

    expect(events.map((event) => event.type)).toEqual([
      "status",
      "user_message",
      "status",
      "citations",
      "status",
      "delta",
      "delta",
      "done",
    ])
    expect(streamTextMock).toHaveBeenCalled()
    expect(events.filter((event) => event.type === "delta")).toEqual([
      { type: "delta", text: "Based on [1], " },
      { type: "delta", text: "the answer is 42." },
    ])
  })
})

describe("answerQuery", () => {
  test("embeds, retrieves context, generates, and persists messages", async () => {
    mockHappyPath()

    const result = await answerQuery({
      userId: sampleConversation.userId,
      conversationId: sampleConversation.id,
      message: " What is the answer? ",
    })

    expect(embeddings.embedText).toHaveBeenCalledWith("What is the answer?")
    expect(vectorStore.retrieveSimilar).toHaveBeenCalledWith({
      embedding: [0.1, 0.2, 0.3],
      limit: 5,
      filter: { conversationId: sampleConversation.id },
    })
    expect(streamTextMock).toHaveBeenCalled()
    expect(messages.createMessage).toHaveBeenCalledTimes(2)
    expect(result.assistantMessage.content).toBe(
      "Based on [1], the answer is 42."
    )
    expect(result.citations).toEqual([
      {
        id: "chunk-1",
        index: 0,
        filename: "paper.pdf",
        kind: "pdf",
        score: 0.91,
        excerpt: "The answer is forty-two.",
      },
    ])
  })

  test("throws forbidden when conversation belongs to another user", async () => {
    spies.push(
      spyOn(conversations, "getConversation").mockResolvedValue(
        sampleConversation
      )
    )

    try {
      await answerQuery({
        userId: "other-user",
        conversationId: sampleConversation.id,
        message: "Hello",
      })
      throw new Error("Expected QueryError")
    } catch (error) {
      expect(error).toBeInstanceOf(QueryError)
      if (error instanceof QueryError) {
        expect(error.code).toBe("forbidden")
      }
    }
  })

  test("throws invalid_input for empty message", async () => {
    try {
      await answerQuery({
        userId: sampleConversation.userId,
        conversationId: sampleConversation.id,
        message: "   ",
      })
      throw new Error("Expected QueryError")
    } catch (error) {
      expect(error).toBeInstanceOf(QueryError)
      if (error instanceof QueryError) {
        expect(error.code).toBe("invalid_input")
      }
    }
  })
})
