import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"

import * as conversations from "@/features/conversations"
import * as indexing from "@/features/indexing"
import type { Conversation, IndexJob } from "@/lib/generated/prisma/client"

const store = {
  create: mock(
    async (_args: unknown): Promise<IndexJob> => {
      throw new Error("create not mocked")
    }
  ),
  findUnique: mock(async (_args: unknown): Promise<IndexJob | null> => null),
  update: mock(
    async (_args: unknown): Promise<IndexJob> => {
      throw new Error("update not mocked")
    }
  ),
}

mock.module("@/lib/db", () => ({
  prisma: {
    indexJob: store,
  },
}))

const {
  IndexJobError,
  createIndexJob,
  getIndexJobForUser,
  processIndexJob,
} = await import("@/features/index-jobs")

const sampleJob: IndexJob = {
  id: "01900000-0000-7000-8000-000000000010",
  userId: "01900000-0000-7000-8000-000000000001",
  status: "indexing",
  type: "url",
  label: "https://example.com",
  filename: null,
  mimeType: null,
  storedPath: null,
  url: "https://example.com",
  kind: null,
  chunkCount: null,
  errorMessage: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
}

const sampleConversation: Conversation = {
  id: "01900000-0000-7000-8000-000000000020",
  userId: sampleJob.userId,
  title: "sample.txt",
  model: "gemini-3.5-flash",
  systemPrompt: null,
  isPinned: false,
  isArchived: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastMessageAt: new Date("2026-01-01T00:00:00.000Z"),
}

const spies: Array<ReturnType<typeof spyOn>> = []

afterEach(() => {
  for (const restore of spies.splice(0)) {
    restore.mockRestore()
  }
  store.create.mockReset()
  store.findUnique.mockReset()
  store.update.mockReset()
})

describe("createIndexJob", () => {
  test("creates an indexing job for a URL", async () => {
    store.create.mockResolvedValueOnce(sampleJob)

    const job = await createIndexJob({
      userId: sampleJob.userId,
      type: "url",
      url: " https://example.com ",
    })

    expect(job).toEqual({
      id: sampleJob.id,
      status: "indexing",
      label: "https://example.com",
      type: "url",
      kind: null,
      chunkCount: null,
      errorMessage: null,
      source: "https://example.com",
    })
    expect(store.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: sampleJob.userId,
        status: "indexing",
        type: "url",
        label: "https://example.com",
        url: "https://example.com",
      }),
    })
  })
})

describe("getIndexJobForUser", () => {
  test("returns the job when it belongs to the user", async () => {
    store.findUnique.mockResolvedValueOnce(sampleJob)

    const job = await getIndexJobForUser(sampleJob.id, sampleJob.userId)

    expect(job.id).toBe(sampleJob.id)
    expect(job.status).toBe("indexing")
  })

  test("throws not_found when the job belongs to another user", async () => {
    store.findUnique.mockResolvedValueOnce(sampleJob)

    try {
      await getIndexJobForUser(sampleJob.id, "other-user")
      throw new Error("Expected IndexJobError")
    } catch (error) {
      expect(error).toBeInstanceOf(IndexJobError)
      if (error instanceof IndexJobError) {
        expect(error.code).toBe("not_found")
      }
    }
  })
})

describe("processIndexJob", () => {
  test("marks the job indexed after a successful indexSource call", async () => {
    store.findUnique.mockResolvedValueOnce(sampleJob)
    store.update.mockResolvedValueOnce({
      ...sampleJob,
      status: "indexed",
      chunkCount: 2,
      kind: "text",
    })
    spies.push(
      spyOn(indexing, "indexSource").mockResolvedValue({
        source: "sample.txt",
        kind: "text",
        chunkCount: 2,
        points: [{ id: "p1", index: 0 }],
      }),
      spyOn(conversations, "createConversation").mockResolvedValue(
        sampleConversation
      ),
      spyOn(conversations, "updateConversation").mockResolvedValue({
        ...sampleConversation,
        title: "sample.txt",
      })
    )

    await processIndexJob(sampleJob.id)

    expect(conversations.createConversation).toHaveBeenCalledWith({
      userId: sampleJob.userId,
      model: "gemini-3.5-flash",
      title: sampleJob.label,
    })
    expect(indexing.indexSource).toHaveBeenCalledWith(
      {
        type: "url",
        url: "https://example.com",
      },
      { conversationId: sampleConversation.id }
    )
    expect(conversations.updateConversation).toHaveBeenCalledWith(
      sampleConversation.id,
      { title: "sample.txt" }
    )
    expect(store.update).toHaveBeenCalledWith({
      where: { id: sampleJob.id },
      data: {
        status: "indexed",
        kind: "text",
        chunkCount: 2,
        label: "sample.txt",
        errorMessage: null,
      },
    })
  })

  test("marks the job as error when indexing fails", async () => {
    store.findUnique.mockResolvedValueOnce(sampleJob)
    store.update.mockResolvedValueOnce({
      ...sampleJob,
      status: "error",
      errorMessage: "boom",
    })
    spies.push(
      spyOn(conversations, "createConversation").mockResolvedValue(
        sampleConversation
      ),
      spyOn(indexing, "indexSource").mockRejectedValue(new Error("boom"))
    )

    await processIndexJob(sampleJob.id)

    expect(conversations.createConversation).toHaveBeenCalled()
    expect(store.update).toHaveBeenCalledWith({
      where: { id: sampleJob.id },
      data: {
        status: "error",
        errorMessage: "boom",
      },
    })
  })
})
