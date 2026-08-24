import "server-only"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { uuidv7 } from "uuidv7"

import { DEFAULT_MODEL, INDEXED_WELCOME_MESSAGE } from "@/features/model"
import { createConversation, updateConversation } from "@/features/conversations"
import {
  IndexError,
  indexSource,
  resolveSafePath,
  type IndexResult,
  type IndexSourceInput,
} from "@/features/indexing"
import { createMessage } from "@/features/messages"
import { prisma } from "@/lib/db"
import type { IndexJob } from "@/lib/generated/prisma/client"
import type { IndexJobStatus } from "@/lib/generated/prisma/enums"
import { Prisma } from "@/lib/generated/prisma/client"

export type IndexJobErrorCode = "not_found" | "invalid_input" | "db_error"

export class IndexJobError extends Error {
  readonly code: IndexJobErrorCode

  constructor(
    code: IndexJobErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "IndexJobError"
    this.code = code
  }
}

export type CreateIndexJobInput = {
  userId: string
} & IndexSourceInput

export type IndexJobPublic = {
  id: string
  status: IndexJobStatus
  label: string
  type: string
  kind: string | null
  chunkCount: number | null
  errorMessage: string | null
  source: string
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename).trim() || "upload"
  return base.replace(/[^\w.\-()+ ]+/g, "_")
}

function toPublic(job: IndexJob): IndexJobPublic {
  return {
    id: job.id,
    status: job.status,
    label: job.label,
    type: job.type,
    kind: job.kind,
    chunkCount: job.chunkCount,
    errorMessage: job.errorMessage,
    source: job.label,
  }
}

export async function createIndexJob(
  input: CreateIndexJobInput
): Promise<IndexJobPublic> {
  const id = uuidv7()

  try {
    if (input.type === "file") {
      const filename = sanitizeFilename(input.filename)
      if (!filename) {
        throw new IndexJobError("invalid_input", "Filename must not be empty.")
      }
      if (input.bytes.byteLength === 0) {
        throw new IndexJobError("invalid_input", "Uploaded file is empty.")
      }

      const storedPath = path.join(id, filename)
      const absolutePath = resolveSafePath(storedPath)
      await mkdir(path.dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, input.bytes)

      const job = await prisma.indexJob.create({
        data: {
          id,
          userId: input.userId,
          status: "indexing",
          type: "file",
          label: filename,
          filename,
          mimeType: input.mimeType?.trim() || null,
          storedPath,
        },
      })
      return toPublic(job)
    }

    const url = input.url.trim()
    if (!url) {
      throw new IndexJobError("invalid_input", "URL must not be empty.")
    }

    const job = await prisma.indexJob.create({
      data: {
        id,
        userId: input.userId,
        status: "indexing",
        type: "url",
        label: url,
        url,
      },
    })
    return toPublic(job)
  } catch (error) {
    if (error instanceof IndexJobError) throw error
    throw new IndexJobError("db_error", "Failed to create index job.", {
      cause: error,
    })
  }
}

export async function getIndexJob(id: string): Promise<IndexJob> {
  const jobId = id.trim()
  if (!jobId) {
    throw new IndexJobError("invalid_input", "id must not be empty.")
  }

  const job = await prisma.indexJob.findUnique({ where: { id: jobId } })
  if (!job) {
    throw new IndexJobError("not_found", `Index job "${jobId}" was not found.`)
  }
  return job
}

export async function getIndexJobForUser(
  id: string,
  userId: string
): Promise<IndexJobPublic> {
  const job = await getIndexJob(id)
  if (job.userId !== userId) {
    throw new IndexJobError("not_found", `Index job "${id}" was not found.`)
  }
  return toPublic(job)
}

async function markJob(
  id: string,
  data: Prisma.IndexJobUpdateInput
): Promise<void> {
  await prisma.indexJob.update({ where: { id }, data })
}

async function toIndexSourceInput(job: IndexJob): Promise<IndexSourceInput> {
  if (job.type === "url") {
    return { type: "url", url: job.url ?? "" }
  }

  if (!job.storedPath || !job.filename) {
    throw new IndexError(
      "invalid_query",
      "File index job is missing stored path."
    )
  }

  const absolutePath = resolveSafePath(job.storedPath)
  let bytes: Buffer
  try {
    bytes = await readFile(absolutePath)
  } catch (error) {
    throw new IndexError(
      "file_not_found",
      `Stored upload was not found for job "${job.id}".`,
      { cause: error }
    )
  }

  return {
    type: "file",
    filename: job.filename,
    mimeType: job.mimeType ?? undefined,
    bytes: new Uint8Array(bytes),
  }
}

async function bootstrapIndexedConversation(
  job: IndexJob,
  result: IndexResult
): Promise<void> {
  const conversation = await createConversation({
    userId: job.userId,
    model: DEFAULT_MODEL,
    title: result.source,
  })

  const message = await createMessage({
    conversationId: conversation.id,
    role: "ASSISTANT",
    status: "COMPLETED",
    content: INDEXED_WELCOME_MESSAGE,
  })

  await updateConversation(conversation.id, {
    lastMessageAt: message.createdAt,
  })
}

export async function processIndexJob(id: string): Promise<void> {
  let job: IndexJob
  try {
    job = await getIndexJob(id)
  } catch {
    return
  }

  if (job.status !== "indexing") return

  try {
    const result = await indexSource(await toIndexSourceInput(job))

    await markJob(id, {
      status: "indexed",
      kind: result.kind,
      chunkCount: result.chunkCount,
      label: result.source,
      errorMessage: null,
    })

    try {
      await bootstrapIndexedConversation(job, result)
    } catch {
      // Best-effort welcome conversation inside after()
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Indexing failed."
    try {
      await markJob(id, {
        status: "error",
        errorMessage: message,
      })
    } catch {
      // Best-effort status update inside after()
    }
  }
}

export type { IndexJob }
export type { IndexJobStatus }
