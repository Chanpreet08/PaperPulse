# Paper Pulse

Paper Pulse is a RAG (retrieval-augmented generation) workspace for asking questions about your documents and links. Upload PDFs, text files, transcripts, or URLs; the app indexes them into a vector store and answers questions grounded in the retrieved source passages.

Built with **Next.js 16**, **Clerk**, **Prisma** + **PostgreSQL**, **Qdrant**, and the **Vercel AI SDK** (Google Gemini / OpenAI).

## Features

- Sign-in with Clerk
- Index files and URLs into embeddings stored in Qdrant
- Per-source conversations scoped by `conversationId` in the vector payload
- Chat UI with streaming answers and citation-aware prompts
- Theme toggle (light / dark)



## Stack


| Layer           | Choice                                                      |
| --------------- | ----------------------------------------------------------- |
| App             | Next.js (App Router), React 19, Tailwind CSS                |
| Auth            | Clerk                                                       |
| Database        | PostgreSQL via Prisma 7                                     |
| Embeddings      | OpenAI-compatible API (`text-embedding-3-small` by default) |
| Vector store    | Qdrant                                                      |
| Chat models     | Google Gemini or OpenAI via `@ai-sdk/*`                     |
| Package manager | Bun                                                         |




## Prerequisites

- [Bun](https://bun.sh) `1.3+`
- [Docker](https://www.docker.com/) (for Qdrant)
- PostgreSQL `16+` (local or remote)
- A [Clerk](https://clerk.com) application
- API keys for embeddings and chat (OpenAI / OpenRouter, and Gemini if using Google)



## Installation

```bash
git clone git@github.com:Chanpreet08/PaperPulse.git paper-pulse
cd paper-pulse
bun install
```



### 1. Start Qdrant

```bash
docker compose up -d
```

Qdrant listens on `http://localhost:6333` by default.

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the values described below.

### 3. Database

Create the Postgres database (example):

```bash
createdb paperpulse
```

Apply migrations and generate the Prisma client:

```bash
bunx prisma migrate deploy
bunx prisma generate
```

For local schema iteration you can use:

```bash
bunx prisma migrate dev
```



### 4. Run the app

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). After signing in, use `/pulse` for the workspace.

## Environment variables

Copy `.env.example` to `.env` and set:

### Clerk


| Variable                                          | Description                         |
| ------------------------------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`               | Clerk publishable key               |
| `CLERK_SECRET_KEY`                                | Clerk secret key                    |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                   | Sign-in path (default `/sign-in`)   |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`                   | Sign-up path (default `/sign-up`)   |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Post sign-in redirect (default `/`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Post sign-up redirect (default `/`) |




### Database


| Variable       | Description                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Postgres connection string, e.g. `postgresql://postgres:postgres@localhost:5432/paperpulse` |




### Embeddings (OpenAI-compatible)


| Variable                 | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`         | API key used for embeddings                                        |
| `OPENAI_BASE_URL`        | Optional base URL (e.g. OpenRouter `https://openrouter.ai/api/v1`) |
| `OPENAI_EMBEDDING_MODEL` | Embedding model (default `text-embedding-3-small`)                 |




### Chat models


| Variable         | Description                           |
| ---------------- | ------------------------------------- |
| `MODEL_PROVIDER` | `GOOGLE` (default) or `OPENAI`        |
| `DEFAULT_MODEL`  | Model id (default `gemini-3.5-flash`) |
| `GEMINI_API_KEY` | Required when `MODEL_PROVIDER=GOOGLE` |


When `MODEL_PROVIDER=OPENAI`, chat uses the OpenAI provider with your OpenAI / OpenRouter credentials.

### Vector store


| Variable            | Description                                       |
| ------------------- | ------------------------------------------------- |
| `VECTOR_STORE`      | `qdrant` (default)                                |
| `QDRANT_URL`        | Qdrant HTTP URL (default `http://localhost:6333`) |
| `QDRANT_COLLECTION` | Collection name (default `paper-pulse`)           |




### Indexing


| Variable          | Description                                        |
| ----------------- | -------------------------------------------------- |
| `INDEX_FILES_DIR` | Directory for uploaded files (default `./uploads`) |




## Scripts


| Command         | Description                  |
| --------------- | ---------------------------- |
| `bun run dev`   | Start Next.js in development |
| `bun run build` | Production build             |
| `bun run start` | Run the production server    |
| `bun run lint`  | ESLint                       |
| `bun test`      | Run Bun tests                |




## Project layout

```text
app/                 # Next.js routes and API handlers
  api/index/         # Start / poll indexing jobs
  api/query/         # Streaming RAG chat
  pulse/             # Authenticated workspace UI
components/pulse/    # Workspace, chat, source picker
features/            # Domain services (users, jobs, query, conversations…)
lib/
  embeddings/        # Chunk + embed pipeline
  extraction/        # File / URL text extraction
  vector-store/      # Qdrant (and stub Postgres) store
prisma/              # Schema and migrations
uploads/             # Local indexed file storage
```



## How it works

1. **Index** — Authenticated users upload a file or URL. The server extracts text, embeds chunks, stores vectors in Qdrant with `conversationId` metadata, and creates a conversation for that source.
2. **Ask** — A question is embedded, similar chunks are retrieved filtered by `conversationId`, and the chat model streams an answer grounded in that context.
3. **Persist** — User and assistant messages are stored in Postgres against the conversation.



## Notes

- Re-index sources after pulling changes that alter Qdrant payload shape (for example `conversationId`), so older points remain queryable under the new filters.
- Keep `.env` out of git; it is ignored by `.gitignore`.

