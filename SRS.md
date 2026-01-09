# Software Requirements Specification (SRS)

Project: Context-Aware Corporate Knowledge Assistant

Brand: OpsMind AI

Version: 1.0

Status: Draft for Review

## 1. Introduction

- **Purpose**
  Define functional and non-functional requirements for OpsMind AI, a context-aware assistant that eliminates time wasted searching internal documents. This SRS will guide design, implementation, verification, and acceptance.

- **Scope**
  OpsMind AI ingests corporate documents (PDFs, policies, SOPs), indexes with a RAG pipeline, and answers employee questions with precise, verifiable citations. It includes an admin dashboard with a Knowledge Graph for usage and co-citation insights and strict role-based access.

- **Definitions/Glossary**
  - RAG: Retrieval Augmented Generation
  - Embedding: Numeric vector representation of text
  - Vector Index: Structure enabling similarity search (cosine)
  - Hallucination Guardrail: System must say “I don’t know” when out-of-context
  - Citation: [Document Title, Page X]
  - RBAC: Role-Based Access Control

- **References**
  - MongoDB Atlas Vector Search
  - OpenAI text-embedding-3-small (or equivalent)
  - LLMs: Gemini 1.5 Flash or OpenAI GPT-4o-mini
  - IEEE 830 SRS guideline (informal adherence)

## 2. Overall Description

- **Product Perspective**
  Web application built with Next.js, Node.js runtime APIs, MongoDB Atlas for storage + vector search. Integrates with OpenAI/Gemini APIs for embeddings and chat completions. JWT auth with roles.

- **Product Functions**
  - Ingest PDFs and extract page-aware text
  - Chunk text with overlap and generate embeddings
  - Vector store and semantic retrieval
  - Chat interface with streaming responses and precise citations
  - Admin analytics + Knowledge Graph visualization
  - RBAC and audit-friendly persistence of Q&A

- **User Classes and Characteristics**
  - Admin: Upload/manage documents, view analytics/graph, manage access.
  - Employee: Ask questions, view cited answers.

- **Operating Environment**
  - Next.js 16, Node.js APIs, MongoDB Atlas.
  - Modern browsers.
  - Cloud-hosted or corporate VPC.

- **Constraints**
  - Corporate data privacy requirements.
  - Hallucination Guardrail must be enforced.
  - Verified, page-level citations required.

- **Assumptions/Dependencies**
  - Documents exist in accessible formats; scanned PDFs may require OCR.
  - Stable network access to LLM/embedding APIs and Atlas.

## 3. System Features and Requirements

### 3.1 RAG Pipeline

- **Description**
  Page-aware parsing, 1000-character chunks with ~200-character overlap, embeddings, and Atlas vector index (1536 dims, cosine).

- **Functional Requirements**
  - FR-1: System shall ingest PDFs and extract per-page text.
  - FR-2: System shall chunk text preserving page metadata.
  - FR-3: System shall generate embeddings using OpenAI text-embedding-3-small (or equivalent).
  - FR-4: System shall store chunks + embeddings in MongoDB Atlas.
  - FR-5: System shall retrieve top-K (≥3, default 5) semantically similar chunks per query.

- **Success Metrics**
  - Vectors indexed and retrievable via Atlas vector index.
  - Querying “Refund Policy” retrieves the correct paragraph with ≥80% precision on internal validation.

### 3.2 Precision Citation Engine

- **Description**
  The LLM synthesis must cite specific document titles and page numbers for every claim.

- **Functional Requirements**
  - FR-6: Assistant responses shall append a “Sources” section listing [Document, Page].
  - FR-7: UI shall render “Reference Cards” with source title and page(s) linked to document context (if available).

- **Non-Functional**
  - NFR-1: Citations must be deterministic from retrieved chunks.
  - NFR-2: Any missing context yields “I don’t know.”

### 3.3 Hallucination Guardrail

- **Requirements**
  - FR-8: If no relevant chunks are retrieved, system must respond “I don’t know.”
  - FR-9: System prompt shall constrain model to use ONLY provided context.

### 3.4 Chat Interface & Streaming

- **Requirements**
  - FR-10: Provide real-time streaming responses (SSE-like) to frontend.
  - FR-11: Support basic controls (send, loading indicator; optional stop).
  - FR-12: Persist chat messages, roles, timestamps, and citations.

- **Performance**
  - NFR-3: P95 time-to-first-token ≤ 2s for short prompts.

### 3.5 Admin Knowledge Graph & Analytics

- **Requirements**
  - FR-13: Dashboard page listing ingested documents, counts, timestamps.
  - FR-14: Knowledge Graph showing co-citation/association between documents/topics.
  - FR-15: Analytics showing top referenced docs/pages and query trends.

### 3.6 Authentication & RBAC

- **Requirements**
  - FR-16: JWT-based authentication with roles: “admin”, “user”.
  - FR-17: Middleware shall restrict /admin routes to admins; redirect others.
  - FR-18: Admin-only APIs for upload, delete, analytics, re-ingest.

### 3.7 Document Management

- **Requirements**
  - FR-19: File upload service (multipart) for PDFs.
  - FR-20: Admin “View chunks” to inspect stored text/page mapping.
  - FR-21: “Re-ingest (paste text)” to bypass OCR when needed.

## 4. External Interface Requirements

- **User Interfaces**
  - /chat: chat UI with streaming and citations
  - /admin/documents: upload, list, delete, view chunks, re-ingest
  - /admin/analytics: charts for usage/top docs
  - /admin/knowledge-graph: SVG graph visualization

- **APIs**
  - POST /api/documents/upload
  - GET/DELETE /api/documents
  - GET /api/document-chunks?documentId=…
  - POST /api/documents/reingest
  - POST /api/chat?mode=stream|json
  - GET /api/admin/analytics, GET /api/admin/knowledge-graph

- **Integrations**
  - Embeddings: OpenAI text-embedding-3-small
  - Chat LLM: Gemini 1.5 Flash or OpenAI GPT-4o-mini
  - Vector Search: MongoDB Atlas $vectorSearch

## 5. Data Requirements

- **Schemas (high level)**
  - Document: { title, fileType, createdAt }
  - DocumentChunk: { documentId, content, embedding[1536], metadata:{ page }, createdAt }
  - Message: { chatId, role, content, citations[], createdAt }
  - Chat: { userId, title, timestamps }
  - User: { email, passwordHash, role, timestamps }

- **Indices**
  - Atlas vector index “vector_index” on documentchunks.embedding (1536 dims, cosine)
  - Email index on users

## 6. Non-Functional Requirements

- **Security/Privacy**
  - NFR-4: JWT httpOnly cookies, secure in production.
  - NFR-5: No sensitive data sent to third-party beyond model inputs; logs sanitized.

- **Reliability**
  - NFR-6: API should gracefully fallback to “I don’t know” instead of 500s.
  - NFR-7: At least daily backups of database or point-in-time recovery.

- **Performance**
  - NFR-8: Retrieval P95 < 500ms on K=5.
  - NFR-9: End-to-end response P95 < 4s for average queries.

- **Maintainability**
  - NFR-10: Clear modular separation: ingestion, search, chat, admin.
  - NFR-11: Environment-driven configuration for API keys and Atlas.

## 7. Timeline, Milestones, and Acceptance Criteria

- **Week 1: Knowledge Ingestion Layer**
  - Deliverables: Upload service, PDF parsing, 1000-char chunking with overlap, embeddings, Atlas storage.
  - Success Metric: Vectors indexed and retrievable via Atlas vector index; “View chunks” shows page-text mapping.

- **Week 2: Retrieval Engine Core**
  - Deliverables: $vectorSearch aggregation; merge user query + Top 3–5 chunks into system prompt.
  - Success Metric: Query “Refund Policy” retrieves the specific paragraph as context; verified in logs/UI.

- **Week 3: Chat Interface & Synthesis**
  - Deliverables: Gemini 1.5 Flash or GPT-4o-mini integration; server streaming to React UI; Reference Cards (citations).
  - Success Metric: Hallucination guardrail passes—OOS questions reliably return “I don’t know.” Streaming visibly works.

## 8. Risk Management

- **Scanned PDFs**: Missing text → Mitigation: re-ingest via pasted text; optional OCR later.
- **API Rate Limits**: Batch embeddings; retry/backoff strategies.
- **Hallucinations**: Strict system prompt, required citations, zero-context refusal.

## 9. Compliance and Legal

- Ensure data handling in line with internal security policies.
- Respect license terms of external APIs and libraries.

## 10. Deployment and Monitoring

- **Environments**: Dev, Staging, Prod.
- **Env Vars**: MONGODB_URI, OPENAI_API_KEY, JWT_SECRET, (optional OCR key later).
- **Monitoring**: Request latency, vector search hit rate, “I don’t know” rate, ingestion errors.

## 11. Acceptance Criteria (Summary)

- AC-1: Users receive accurate, cited answers with [Document, Page].
- AC-2: When context is absent, system responds “I don’t know.”
- AC-3: Admins can upload, view chunks, analyze usage, and re-ingest without OCR.
- AC-4: Streaming responses visible in the chat UI.
- AC-5: Retrieval correctness validated with targeted queries like “Refund Policy”.
