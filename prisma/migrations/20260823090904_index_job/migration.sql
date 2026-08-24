-- CreateEnum
CREATE TYPE "IndexJobStatus" AS ENUM ('indexing', 'indexed', 'error');

-- CreateTable
CREATE TABLE "IndexJob" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "IndexJobStatus" NOT NULL DEFAULT 'indexing',
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "storedPath" TEXT,
    "url" TEXT,
    "kind" TEXT,
    "chunkCount" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndexJob_userId_idx" ON "IndexJob"("userId");

-- AddForeignKey
ALTER TABLE "IndexJob" ADD CONSTRAINT "IndexJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
