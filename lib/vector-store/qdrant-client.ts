import { QdrantClient } from "@qdrant/js-client-rest"

import { VectorStoreError } from "./errors"

let client: QdrantClient | null = null

export function createQdrantClient(): QdrantClient {
  if (client) return client

  const url = process.env.QDRANT_URL
  if (!url) {
    throw new VectorStoreError("missing_config", "QDRANT_URL is not set.")
  }

  client = new QdrantClient({ url })
  return client
}
