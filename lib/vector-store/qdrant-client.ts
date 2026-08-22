import { QdrantClient } from "@qdrant/js-client-rest"

import { VectorStoreError } from "./errors"

export function createQdrantClient(): QdrantClient {
  const url = process.env.QDRANT_URL
  if (!url) {
    throw new VectorStoreError("missing_config", "QDRANT_URL is not set.")
  }

  return new QdrantClient({ url })
}
