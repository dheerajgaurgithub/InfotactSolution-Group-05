# OpsMind Assistant (Policy RAG Chatbot)

Production-ready Retrieval-Augmented Generation (RAG) chatbot built with Next.js. It lets admins upload policy documents (PDF/DOCX/TXT), indexes them into MongoDB with embeddings, and answers user questions grounded in the selected sources. Includes multi-document source selection, streaming chat UI, multilingual keyword fallback, and robust error handling.

## Tech Stack
- Next.js (App Router)
- MongoDB Atlas + Vector Search
- OpenAI Embeddings + Chat Completions
- React UI (ChatGPT-style scrolling, loading/thinking indicator)

## Prerequisites
- Node.js 18+
- MongoDB Atlas cluster (or MongoDB with vector search)
- OpenAI API key

## Environment Variables (.env.local)
Create a `.env.local` at project root with:

```
MONGODB_URI=your_mongodb_atlas_uri
OPENAI_API_KEY=sk-...
JWT_SECRET=your_secure_random_string
OCR_SPACE_API_KEY=optional_for_scanned_pdfs
SEED_TOKEN=dev_only_token_for_seed_route
```

Notes:
- Do NOT commit real secrets. `.env*` is ignored by .gitignore.
- If you previously committed any keys, rotate them.

## Install & Run (Local)
```
# install deps
npm install

# dev server
npm run dev
# or
npm run build && npm start
```
App runs by default at http://localhost:3000

## First-Time Setup (Dev Seed Optional)
- Optional seeding (if present): visit `/api/dev/seed?token=SEED_TOKEN` to ingest `Document.txt` for quick testing.
- Or upload your own documents from the Admin Documents page.

## Using the App
1. Go to `/chat`.
2. In the Sources sidebar, click Refresh and select one or more documents.
3. Ask questions. The assistant retrieves relevant chunks and answers with citations.
4. If no source is selected, the UI prompts you to pick a source.
5. Multilingual queries are supported via Unicode-aware keyword fallback.

## Uploading Documents
- Supported: PDF, DOCX, TXT. Scanned PDFs use OCR if `OCR_SPACE_API_KEY` is set.
- The system chunks text and stores embeddings in `DocumentChunk` collection.
- Chunk counts are visible in the Admin Documents page.

## Troubleshooting
- 500 errors on auth: ensure `JWT_SECRET` is set and your MongoDB IP whitelist includes your machine.
- No responses or “No sources”:
  - Ensure you selected sources in the sidebar.
  - Verify chunkCount > 0 via `/api/documents?public=1`.
  - Check the POST `/api/chat` payload includes `documentIds`.
- Embedding limits: app falls back to keyword search and direct chunk sampling.
- Scrolling: chat pane scrolls like ChatGPT; thinking indicator waits at least 5s.

## Security & Git Hygiene
- `.env*` and `Keys/` are ignored by Git.
- If secret scanning blocks a push, remove the secret from commits and rotate the key.

## Deploying
- Configure the same env vars on your hosting provider (e.g., Vercel, Netlify, or custom).
- Ensure the app has network access to MongoDB Atlas.

## Project Scripts
- `dev`: start next dev server
- `build`: build production
- `start`: start production server

## Contributing
- Create feature branches and open PRs.
- Keep secrets out of commits.

## License
Proprietary / Internal. Update as needed.
