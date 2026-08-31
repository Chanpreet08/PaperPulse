import "server-only"

import { uuidv7 } from "uuidv7"

import { prisma } from "@/lib/db"
import type { Conversation, Message } from "@/lib/generated/prisma/client"
import { Prisma } from "@/lib/generated/prisma/client"

export type ConversationErrorCode =
  | "not_found"
  | "invalid_input"
  | "db_error"

export class ConversationError extends Error {
  readonly code: ConversationErrorCode

  constructor(
    code: ConversationErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "ConversationError"
    this.code = code
  }
}

export type CreateConversationInput = {
  userId: string
  model: string
  title?: string
  systemPrompt?: string | null
  isPinned?: boolean
  isArchived?: boolean
}

export type UpsertConversationInput = CreateConversationInput & {
  id: string
}

export type UpdateConversationInput = {
  title?: string
  model?: string
  systemPrompt?: string | null
  isPinned?: boolean
  isArchived?: boolean
  lastMessageAt?: Date
}

export type ConversationWithMessages = Conversation & {
  messages: Message[]
}

export type ListConversationsForUserOptions = {
  includeArchived?: boolean
}

function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new ConversationError("invalid_input", `${field} must not be empty.`)
  }
  return trimmed
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
}

function buildConversationData(input: CreateConversationInput) {
  return {
    userId: assertNonEmpty(input.userId, "userId"),
    model: assertNonEmpty(input.model, "model"),
    title: input.title?.trim() || "New Conversation",
    systemPrompt: input.systemPrompt?.trim() || null,
    isPinned: input.isPinned ?? false,
    isArchived: input.isArchived ?? false,
  }
}

export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  const data = buildConversationData(input)

  try {
    return await prisma.conversation.create({
      data: {
        id: uuidv7(),
        ...data,
      },
    })
  } catch (error) {
    throw new ConversationError("db_error", "Failed to create conversation.", {
      cause: error,
    })
  }
}

export async function upsertConversation(
  input: UpsertConversationInput
): Promise<Conversation> {
  const id = assertNonEmpty(input.id, "id")
  const createData = buildConversationData(input)

  const updateData: Prisma.ConversationUpdateInput = {
    model: createData.model,
    title: createData.title,
    systemPrompt: createData.systemPrompt,
    isPinned: createData.isPinned,
    isArchived: createData.isArchived,
  }

  try {
    return await prisma.conversation.upsert({
      where: { id },
      create: { id, ...createData },
      update: updateData,
    })
  } catch (error) {
    throw new ConversationError("db_error", "Failed to upsert conversation.", {
      cause: error,
    })
  }
}

export async function getConversation(id: string): Promise<Conversation> {
  const conversationId = assertNonEmpty(id, "id")

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  })
  if (!conversation) {
    throw new ConversationError(
      "not_found",
      `Conversation "${conversationId}" was not found.`
    )
  }
  return conversation
}

export async function listConversationsForUser(
  userId: string,
  options: ListConversationsForUserOptions = {}
): Promise<ConversationWithMessages[]> {
  const id = assertNonEmpty(userId, "userId")
  const includeArchived = options.includeArchived ?? false

  try {
    return await prisma.conversation.findMany({
      where: {
        userId: id,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { lastMessageAt: "desc" },
      ],
    })
  } catch (error) {
    throw new ConversationError(
      "db_error",
      "Failed to list conversations.",
      { cause: error }
    )
  }
}

export async function updateConversation(
  id: string,
  input: UpdateConversationInput
): Promise<Conversation> {
  const conversationId = assertNonEmpty(id, "id")

  if (
    input.title === undefined &&
    input.model === undefined &&
    input.systemPrompt === undefined &&
    input.isPinned === undefined &&
    input.isArchived === undefined &&
    input.lastMessageAt === undefined
  ) {
    throw new ConversationError("invalid_input", "No fields provided to update.")
  }

  const data: Prisma.ConversationUpdateInput = {}

  if (input.title !== undefined) {
    data.title = assertNonEmpty(input.title, "title")
  }
  if (input.model !== undefined) {
    data.model = assertNonEmpty(input.model, "model")
  }
  if (input.systemPrompt !== undefined) {
    data.systemPrompt = input.systemPrompt?.trim() || null
  }
  if (input.isPinned !== undefined) {
    data.isPinned = input.isPinned
  }
  if (input.isArchived !== undefined) {
    data.isArchived = input.isArchived
  }
  if (input.lastMessageAt !== undefined) {
    data.lastMessageAt = input.lastMessageAt
  }

  try {
    return await prisma.conversation.update({
      where: { id: conversationId },
      data,
    })
  } catch (error) {
    if (isNotFound(error)) {
      throw new ConversationError(
        "not_found",
        `Conversation "${conversationId}" was not found.`,
        { cause: error }
      )
    }
    throw new ConversationError("db_error", "Failed to update conversation.", {
      cause: error,
    })
  }
}

export async function deleteConversation(id: string): Promise<Conversation> {
  const conversationId = assertNonEmpty(id, "id")

  try {
    return await prisma.conversation.delete({ where: { id: conversationId } })
  } catch (error) {
    if (isNotFound(error)) {
      throw new ConversationError(
        "not_found",
        `Conversation "${conversationId}" was not found.`,
        { cause: error }
      )
    }
    throw new ConversationError("db_error", "Failed to delete conversation.", {
      cause: error,
    })
  }
}

export type { Conversation, Message }
