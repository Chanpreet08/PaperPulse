import "server-only"

import { uuidv7 } from "uuidv7"

import { prisma } from "@/lib/db"
import type { Message } from "@/lib/generated/prisma/client"
import { Prisma } from "@/lib/generated/prisma/client"
import type { MessageRole, MessageStatus } from "@/lib/generated/prisma/enums"

export type MessageErrorCode = "not_found" | "invalid_input" | "db_error"

export class MessageError extends Error {
  readonly code: MessageErrorCode

  constructor(
    code: MessageErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "MessageError"
    this.code = code
  }
}

export type CreateMessageInput = {
  conversationId: string
  role: MessageRole
  status: MessageStatus
  content: string
  parts?: Prisma.InputJsonValue | null
  metadata?: Prisma.InputJsonValue | null
  parentMessageId?: string | null
}

export type UpdateMessageInput = {
  role?: MessageRole
  status?: MessageStatus
  content?: string
  parts?: Prisma.InputJsonValue | null
  metadata?: Prisma.InputJsonValue | null
  parentMessageId?: string | null
}

function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new MessageError("invalid_input", `${field} must not be empty.`)
  }
  return trimmed
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
}

function toJsonInput(
  value: Prisma.InputJsonValue | null | undefined
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value
}

export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const conversationId = assertNonEmpty(input.conversationId, "conversationId")
  const content = assertNonEmpty(input.content, "content")
  const parentMessageId = input.parentMessageId?.trim() || null

  try {
    return await prisma.message.create({
      data: {
        id: uuidv7(),
        conversationId,
        role: input.role,
        status: input.status,
        content,
        parts: toJsonInput(input.parts),
        metadata: toJsonInput(input.metadata),
        parentMessageId,
      },
    })
  } catch (error) {
    throw new MessageError("db_error", "Failed to create message.", {
      cause: error,
    })
  }
}

export async function getMessage(id: string): Promise<Message> {
  const messageId = assertNonEmpty(id, "id")

  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message) {
    throw new MessageError("not_found", `Message "${messageId}" was not found.`)
  }
  return message
}

export async function updateMessage(
  id: string,
  input: UpdateMessageInput
): Promise<Message> {
  const messageId = assertNonEmpty(id, "id")

  if (
    input.role === undefined &&
    input.status === undefined &&
    input.content === undefined &&
    input.parts === undefined &&
    input.metadata === undefined &&
    input.parentMessageId === undefined
  ) {
    throw new MessageError("invalid_input", "No fields provided to update.")
  }

  const data: Prisma.MessageUncheckedUpdateInput = {}

  if (input.role !== undefined) {
    data.role = input.role
  }
  if (input.status !== undefined) {
    data.status = input.status
  }
  if (input.content !== undefined) {
    data.content = assertNonEmpty(input.content, "content")
  }
  if (input.parts !== undefined) {
    data.parts = toJsonInput(input.parts)
  }
  if (input.metadata !== undefined) {
    data.metadata = toJsonInput(input.metadata)
  }
  if (input.parentMessageId !== undefined) {
    data.parentMessageId = input.parentMessageId?.trim() || null
  }

  try {
    return await prisma.message.update({
      where: { id: messageId },
      data,
    })
  } catch (error) {
    if (isNotFound(error)) {
      throw new MessageError(
        "not_found",
        `Message "${messageId}" was not found.`,
        { cause: error }
      )
    }
    throw new MessageError("db_error", "Failed to update message.", {
      cause: error,
    })
  }
}

export async function deleteMessage(id: string): Promise<Message> {
  const messageId = assertNonEmpty(id, "id")

  try {
    return await prisma.message.delete({ where: { id: messageId } })
  } catch (error) {
    if (isNotFound(error)) {
      throw new MessageError(
        "not_found",
        `Message "${messageId}" was not found.`,
        { cause: error }
      )
    }
    throw new MessageError("db_error", "Failed to delete message.", {
      cause: error,
    })
  }
}

export type { Message, MessageRole, MessageStatus }
