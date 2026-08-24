import "server-only"

import { uuidv7 } from "uuidv7"

import { prisma } from "@/lib/db"
import type { User } from "@/lib/generated/prisma/client"
import { Prisma } from "@/lib/generated/prisma/client"

export type UserErrorCode =
  | "not_found"
  | "conflict"
  | "invalid_input"
  | "db_error"

export class UserError extends Error {
  readonly code: UserErrorCode

  constructor(
    code: UserErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = "UserError"
    this.code = code
  }
}

export type CreateUserInput = {
  email: string
  name: string
  imageUrl?: string | null
}

export type UpdateUserInput = {
  email?: string
  name?: string
  imageUrl?: string | null
}

export type GetUserQuery = { id: string } | { email: string }

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new UserError("invalid_input", `${field} must not be empty.`)
  }
  return trimmed
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const email = normalizeEmail(assertNonEmpty(input.email, "email"))
  const name = assertNonEmpty(input.name, "name")
  const imageUrl = input.imageUrl?.trim() || null

  try {
    return await prisma.user.create({
      data: {
        id: uuidv7(),
        email,
        name,
        imageUrl,
      },
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new UserError(
        "conflict",
        `A user with email "${email}" already exists.`,
        { cause: error }
      )
    }
    throw new UserError("db_error", "Failed to create user.", { cause: error })
  }
}

export async function upsertUser(input: CreateUserInput): Promise<User> {
  const email = normalizeEmail(assertNonEmpty(input.email, "email"))
  const name = assertNonEmpty(input.name, "name")
  const imageUrl = input.imageUrl?.trim() || null

  try {
    return await prisma.user.upsert({
      where: { email },
      create: {
        id: uuidv7(),
        email,
        name,
        imageUrl,
      },
      update: {
        name,
        imageUrl,
      },
    })
  } catch (error) {
    throw new UserError("db_error", "Failed to upsert user.", { cause: error })
  }
}

export async function getUser(query: GetUserQuery): Promise<User> {
  if ("id" in query) {
    const id = assertNonEmpty(query.id, "id")
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      throw new UserError("not_found", `User "${id}" was not found.`)
    }
    return user
  }

  const email = normalizeEmail(assertNonEmpty(query.email, "email"))
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new UserError("not_found", `User with email "${email}" was not found.`)
  }
  return user
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<User> {
  const userId = assertNonEmpty(id, "id")

  if (
    input.email === undefined &&
    input.name === undefined &&
    input.imageUrl === undefined
  ) {
    throw new UserError("invalid_input", "No fields provided to update.")
  }

  const data: Prisma.UserUpdateInput = {}

  if (input.email !== undefined) {
    data.email = normalizeEmail(assertNonEmpty(input.email, "email"))
  }
  if (input.name !== undefined) {
    data.name = assertNonEmpty(input.name, "name")
  }
  if (input.imageUrl !== undefined) {
    data.imageUrl = input.imageUrl?.trim() || null
  }

  try {
    return await prisma.user.update({
      where: { id: userId },
      data,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new UserError("not_found", `User "${userId}" was not found.`, {
        cause: error,
      })
    }
    if (isUniqueViolation(error)) {
      throw new UserError(
        "conflict",
        `A user with email "${String(data.email)}" already exists.`,
        { cause: error }
      )
    }
    throw new UserError("db_error", "Failed to update user.", { cause: error })
  }
}

export async function deleteUser(id: string): Promise<User> {
  const userId = assertNonEmpty(id, "id")

  try {
    return await prisma.user.delete({ where: { id: userId } })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new UserError("not_found", `User "${userId}" was not found.`, {
        cause: error,
      })
    }
    throw new UserError("db_error", "Failed to delete user.", { cause: error })
  }
}

export type { User }
