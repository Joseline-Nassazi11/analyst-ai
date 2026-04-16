# 🔬 Analyst AI — Evidence-Driven Research Assistant

> A full-stack RAG-powered research assistant that lets you upload documents, ask questions, search the web, generate professional reports, and manage citations — all in one place.

---

## 📌 Project Overview

**Analyst AI** is an AI-powered research platform built for Case 1 of the Turing College AI Engineering Capstone: *Retrieval-Augmented Generation (RAG)-Powered Knowledge Assistant*.

### The Problem It Solves

Researchers, analysts, and knowledge workers spend enormous time manually reading through documents, cross-referencing sources, and synthesising information. Traditional keyword search misses context. Generic chatbots hallucinate facts without grounding.

**Analyst AI solves this** by combining semantic document search (RAG) with live web search, multi-model LLM support, and structured report generation — giving users a single interface to do evidence-based research with full source traceability.

### How It Works

1. **Upload documents** (PDF, DOCX, CSV, TXT, Markdown) — files are parsed, chunked into 800-character overlapping segments, and embedded using OpenAI `text-embedding-3-small`
2. **Embeddings are stored** in a Supabase PostgreSQL database with the `pgvector` extension, enabling fast cosine similarity search
3. **When you ask a question**, the RAG agent dynamically calculates how many chunks to retrieve based on query complexity (`getDynamicK`), fetches the most semantically relevant passages, and injects them as context into the LLM prompt
4. **The AI agent** then uses 6 tools: document search, live web search (Tavily), report generation, citation saving, CSV data analysis, and multi-document comparison
5. **Responses are streamed** back to the UI in real time, with sources, similarity scores, and cost tracking

---

## ✨ Key Features

- **Multi-model support** — Switch between OpenAI (GPT-4o, GPT-4o Mini), Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku), Google (Gemini 1.5 Pro/Flash), and Groq (Llama 3.1) from the sidebar
- **Hybrid RAG** — Combines semantic document search with live Tavily web search for up-to-date answers
- **Dynamic retrieval** — Automatically retrieves more chunks for broad queries ("summarise everything") and fewer for specific ones
- **Web search caching** — Tavily results are cached in Supabase for 24 hours to reduce API costs
- **Report generation** — AI generates structured Markdown reports, saved to the database and downloadable as `.docx`
- **Citation management** — Save, format, and export citations in APA, MLA, and Chicago formats
- **CSV analytics** — Upload a CSV and get auto-generated charts and data summaries
- **Document comparison** — Compare up to 5 documents on any topic using semantic similarity
- **Session persistence** — All chat sessions, messages, and documents are saved per user
- **Full logging layer** — Every tool call, search, and LLM interaction is logged with timing metadata to Supabase
- **Onboarding tour** — Step-by-step guide for new users
- **Dark/light/system theme** — Persisted in local storage

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Next.js 14 Frontend                │
│  Chat UI · Documents · Reports · Citations · Analytics │
└────────────────────┬────────────────────────────────┘
                     │ API Routes (/api/*)
┌────────────────────▼────────────────────────────────┐
│              AI Agent (Vercel AI SDK)               │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │ragSearch │ │webSearch │ │generateReport        ││
│  │          │ │ (Tavily) │ │saveCitation          ││
│  │          │ │          │ │analyzeData           ││
│  └────┬─────┘ └──────────┘ │compareDocuments      ││
│       │                    └──────────────────────┘│
│  ┌────▼──────────────────────────────────────────┐ │
│  │           LLM Providers                       │ │
│  │  OpenAI · Anthropic · Google · Groq           │ │
│  └───────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                   Supabase                          │
│                                                     │
│  PostgreSQL + pgvector   Auth   Storage             │
│  ─────────────────────────────────────────────────  │
│  documents · document_chunks (embeddings)           │
│  chat_sessions · chat_messages · reports            │
│  citations · search_cache · logs · user_memory      │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| AI SDK | Vercel AI SDK v3 |
| LLM Providers | OpenAI, Anthropic, Google, Groq |
| Embeddings | OpenAI `text-embedding-3-small` |
| Vector DB | Supabase + pgvector |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Web Search | Tavily API |
| State | Zustand (with persistence) |
| Styling | Tailwind CSS |
| Document parsing | pdf-parse, mammoth |
| Report export | docx |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- At least one LLM API key (OpenAI recommended)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd analyst
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your keys:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Providers (at least one required)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
GROQ_API_KEY=your_groq_api_key

# Web Search (optional but recommended)
TAVILY_API_KEY=your_tavily_api_key
```

### 3. Set up the database

Run the contents of `supabase/schema.sql` in your Supabase SQL editor. This creates all tables, indexes, the `match_document_chunks` RPC function, and Row Level Security policies.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🧠 How RAG Works in This Project

```
User question
      │
      ▼
Embed question using text-embedding-3-small
      │
      ▼
getDynamicK() → calculates optimal chunk count
  - Broad queries ("summarise all") → k=10
  - Medium queries (>50 chars)      → k=5
  - Specific queries                → k=3
      │
      ▼
match_document_chunks() → cosine similarity search in pgvector
      │
      ▼
Top-k chunks injected into LLM system prompt as context
      │
      ▼
LLM generates grounded, cited response
      │
      ▼
Sources shown in UI with similarity scores
```

---

## 📊 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/chat` | Main chat endpoint with streaming |
| GET/POST/DELETE | `/api/ingest` | Document upload and management |
| GET | `/api/ingest/csv` | CSV content retrieval for analytics |
| GET/POST/DELETE | `/api/sessions` | Chat session management |
| PATCH | `/api/sessions` | Update session title or message feedback |
| GET/DELETE | `/api/export` | Report download and management |
| GET/POST/DELETE | `/api/citations` | Citation management |
| POST | `/api/search` | Multi-document semantic search |
| GET/POST | `/api/memory` | User memory persistence |
| GET | `/api/health` | System health check |

---

## ⚖️ Ethical Considerations

### Data Privacy
- All user data is stored in a private Supabase instance with Row Level Security (RLS) enabled — users can only access their own documents, sessions, and citations
- Documents are stored in a private (non-public) Supabase Storage bucket
- No user document content is ever logged or retained by third-party LLM providers beyond the scope of individual API calls
- The `.env` file is excluded from version control via `.gitignore`

### Bias and Accuracy
- The system retrieves information from user-supplied documents and the open web, meaning the quality and bias of responses depend directly on the quality of source material
- Similarity scores are shown alongside retrieved chunks, allowing users to judge source relevance themselves
- The application does not claim factual authority — it provides sourced evidence for users to evaluate

### Responsible AI Use
- The assistant is designed for research assistance, not autonomous decision-making
- Users retain full control over what documents are uploaded and can delete them at any time
- Web search results are cached and attributed with URLs so users can verify sources independently

### Environmental Impact
- Web search results are cached for 24 hours to reduce redundant API calls
- Dynamic k-retrieval avoids unnecessarily large embedding lookups
- Users can switch to smaller, cheaper models (GPT-4o Mini, Groq Llama) to reduce compute cost

### Limitations
- The system has no knowledge cutoff awareness beyond the LLM's training data — web search mitigates this but does not eliminate it
- Embedding quality depends on OpenAI's `text-embedding-3-small` model; domain-specific documents may benefit from fine-tuned embeddings
- The in-memory rate limiter resets on server restart; a production deployment should use Redis-backed rate limiting

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/          # Streaming chat with AI agent
│   │   ├── ingest/        # Document upload & CSV retrieval
│   │   ├── sessions/      # Chat session CRUD
│   │   ├── export/        # Report download (DOCX)
│   │   ├── citations/     # Citation management
│   │   ├── search/        # Multi-document semantic search
│   │   ├── memory/        # User memory persistence
│   │   └── health/        # System health check
│   └── auth/              # Login / signup pages
├── components/
│   ├── chat/              # Chat UI, message bubbles, input
│   ├── documents/         # Document library, CSV dashboard
│   ├── layout/            # Header, Sidebar
│   ├── reports/           # Reports panel
│   ├── citations/         # Citations panel
│   └── onboarding/        # Onboarding tour
├── lib/
│   ├── ai/
│   │   ├── prompts.ts     # System prompt builder (personality-aware)
│   │   ├── providers.ts   # LLM provider routing + cost estimation
│   │   └── tools.ts       # All 6 agent tools
│   ├── db/
│   │   └── supabase.ts    # Browser / server / admin clients
│   ├── logger/
│   │   └── index.ts       # Structured logging + dynamic k
│   ├── rag/
│   │   └── ingest.ts      # Chunking, parsing, embedding pipeline
│   ├── store.ts           # Zustand global state
│   └── utils/
│       ├── citations.ts   # Citation formatting (APA/MLA/Chicago)
│       ├── cn.ts          # Tailwind class utility
│       ├── docx.ts        # DOCX report generation
│       └── sanitize.ts    # Input sanitization + rate limiting
├── types/
│   └── index.ts           # All TypeScript types
supabase/
└── schema.sql             # Full database schema with RLS
```

---

## 🔑 Key Design Decisions

**Why Supabase over ChromaDB?**
Supabase with pgvector combines the vector store, relational database, authentication, and file storage in a single managed service — reducing operational complexity while maintaining production-grade performance.

**Why Vercel AI SDK over LangChain?**
The AI SDK provides type-safe streaming, built-in tool calling, and first-class multi-provider support with significantly less boilerplate than LangChain for this use case.

**Why dynamic k-retrieval?**
A fixed `k=3` (noted in previous reviews) performs poorly on broad summarisation queries. `getDynamicK()` adapts chunk count to query intent, improving both recall and response quality.

**Why web search caching?**
Tavily API calls are cached for 24 hours. Repeated queries on the same topic (common in research workflows) return instantly without additional API cost.

---

## 📄 License

This project was built as part of the Turing College AI Engineering Capstone programme.