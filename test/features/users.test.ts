import { describe, expect, mock, test } from "bun:test"

import { Prisma } from "@/lib/generated/prisma/client"
import type { User } from "@/lib/generated/prisma/client"

const store = {
  create: mock(
    async (_args: unknown): Promise<User> => {
      throw new Error("create not mocked")
    }
  ),
  upsert: mock(
    async (_args: unknown): Promise<User> => {
      throw new Error("upsert not mocked")
    }
  ),
  findUnique: mock(async (_args: unknown): Promise<User | null> => null),
  update: mock(
    async (_args: unknown): Promise<User> => {
      throw new Error("update not mocked")
    }
  ),
  delete: mock(
    async (_args: unknown): Promise<User> => {
      throw new Error("delete not mocked")
    }
  ),
}

mock.module("@/lib/db", () => ({
  prisma: {
    user: store,
  },
}))

const {
  UserError,
  createUser,
  upsertUser,
  getUser,
  updateUser,
  deleteUser,
} = await import("@/features/users")

const sampleUser: User = {
  id: "01900000-0000-7000-8000-000000000001",
  email: "ada@example.com",
  name: "Ada Lovelace",
  imageUrl: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
}

describe("createUser", () => {
  test("creates a user with normalized email", async () => {
    store.create.mockResolvedValueOnce(sampleUser)

    const user = await createUser({
      email: "  Ada@Example.com ",
      name: " Ada Lovelace ",
    })

    expect(user).toEqual(sampleUser)
    expect(store.create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        email: "ada@example.com",
        name: "Ada Lovelace",
        imageUrl: null,
      },
    })
  })

  test("throws invalid_input for empty name", async () => {
    try {
      await createUser({ email: "ada@example.com", name: "   " })
      throw new Error("Expected UserError")
    } catch (error) {
      expect(error).toBeInstanceOf(UserError)
      if (error instanceof UserError) {
        expect(error.code).toBe("invalid_input")
      }
    }
  })

  test("throws conflict on duplicate email", async () => {
    store.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "test",
      })
    )

    try {
      await createUser({ email: "ada@example.com", name: "Ada" })
      throw new Error("Expected UserError")
    } catch (error) {
      expect(error).toBeInstanceOf(UserError)
      if (error instanceof UserError) {
        expect(error.code).toBe("conflict")
      }
    }
  })
})

describe("upsertUser", () => {
  test("upserts by email and updates profile fields", async () => {
    store.upsert.mockResolvedValueOnce(sampleUser)

    const user = await upsertUser({
      email: "  Ada@Example.com ",
      name: " Ada Lovelace ",
      imageUrl: " https://img.example/ada.png ",
    })

    expect(user).toEqual(sampleUser)
    expect(store.upsert).toHaveBeenCalledWith({
      where: { email: "ada@example.com" },
      create: {
        id: expect.any(String),
        email: "ada@example.com",
        name: "Ada Lovelace",
        imageUrl: "https://img.example/ada.png",
      },
      update: {
        name: "Ada Lovelace",
        imageUrl: "https://img.example/ada.png",
      },
    })
  })
})

describe("getUser", () => {
  test("returns a user by id", async () => {
    store.findUnique.mockResolvedValueOnce(sampleUser)

    const user = await getUser({ id: sampleUser.id })

    expect(user).toEqual(sampleUser)
    expect(store.findUnique).toHaveBeenCalledWith({
      where: { id: sampleUser.id },
    })
  })

  test("returns a user by email", async () => {
    store.findUnique.mockResolvedValueOnce(sampleUser)

    const user = await getUser({ email: "  Ada@Example.com " })

    expect(user).toEqual(sampleUser)
    expect(store.findUnique).toHaveBeenCalledWith({
      where: { email: "ada@example.com" },
    })
  })

  test("throws not_found when missing", async () => {
    store.findUnique.mockResolvedValueOnce(null)

    try {
      await getUser({ id: sampleUser.id })
      throw new Error("Expected UserError")
    } catch (error) {
      expect(error).toBeInstanceOf(UserError)
      if (error instanceof UserError) {
        expect(error.code).toBe("not_found")
      }
    }
  })
})

describe("updateUser", () => {
  test("updates provided fields", async () => {
    const updated = { ...sampleUser, name: "Ada L." }
    store.update.mockResolvedValueOnce(updated)

    const user = await updateUser(sampleUser.id, { name: " Ada L. " })

    expect(user).toEqual(updated)
    expect(store.update).toHaveBeenCalledWith({
      where: { id: sampleUser.id },
      data: { name: "Ada L." },
    })
  })

  test("throws invalid_input when no fields are provided", async () => {
    try {
      await updateUser(sampleUser.id, {})
      throw new Error("Expected UserError")
    } catch (error) {
      expect(error).toBeInstanceOf(UserError)
      if (error instanceof UserError) {
        expect(error.code).toBe("invalid_input")
      }
    }
  })

  test("throws not_found when the user does not exist", async () => {
    store.update.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
      })
    )

    try {
      await updateUser(sampleUser.id, { name: "Ada" })
      throw new Error("Expected UserError")
    } catch (error) {
      expect(error).toBeInstanceOf(UserError)
      if (error instanceof UserError) {
        expect(error.code).toBe("not_found")
      }
    }
  })
})

describe("deleteUser", () => {
  test("deletes and returns the user", async () => {
    store.delete.mockResolvedValueOnce(sampleUser)

    const user = await deleteUser(sampleUser.id)

    expect(user).toEqual(sampleUser)
    expect(store.delete).toHaveBeenCalledWith({
      where: { id: sampleUser.id },
    })
  })

  test("throws not_found when the user does not exist", async () => {
    store.delete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
      })
    )

    try {
      await deleteUser(sampleUser.id)
      throw new Error("Expected UserError")
    } catch (error) {
      expect(error).toBeInstanceOf(UserError)
      if (error instanceof UserError) {
        expect(error.code).toBe("not_found")
      }
    }
  })
})
