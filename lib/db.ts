import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function getPrismaClient() {
    const url = process.env.DATABASE_URL;

    if (!url) {
        throw new Error('DATABASE_URL is not set')
    }

    const adapter = new PrismaPg({ connectionString: url })
    return new PrismaClient({
        adapter,
    })
}


export const prisma = globalForPrisma.prisma || getPrismaClient();