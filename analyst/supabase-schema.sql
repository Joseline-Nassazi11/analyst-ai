-- ============================================================
-- Analyst AI — Supabase Database Schema
-- ============================================================
-- Run this in your Supabase SQL editor to set up all tables.
-- Requires the pgvector extension for semantic search.
-- ============================================================

-- Enable pgvector for embeddings
create extension if not exists vector;

-- ── Users (managed by Supabase Auth — no manual creation needed) ─────────────

-- ── Documents ────────────────────────────────────────────────────────────────
create table if not exists documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  type          text not null check (type in ('pdf', 'txt', 'md', 'csv', 'docx')),
  size          bigint not null default 0,
  storage_path  text,
  chunk_count   int not null default 0,
  status        text not null default 'pending'
                  check (status in ('pending', 'processing', 'ready', 'error')),
  error_message text,
  metadata      jsonb default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists documents_user_id_idx on documents(user_id);
create index if not exists documents_status_idx  on documents(status);

-- ── Document Chunks (with embeddings) ────────────────────────────────────────
create table if not exists document_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references documents(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  content       text not null,
  chunk_index   int  not null,
  embedding     vector(1536),   -- text-embedding-3-small dimension
  created_at    timestamptz not null default now()
);

create index if not exists document_chunks_document_id_idx on document_chunks(document_id);
create index if not exists document_chunks_user_id_idx     on document_chunks(user_id);

-- IVFFlat index for fast approximate nearest-neighbour search
create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ── Semantic Search RPC ───────────────────────────────────────────────────────
-- Called by ragSearchTool and compareDocumentsTool
create or replace function match_document_chunks(
  query_embedding  vector(1536),
  match_threshold  float,
  match_count      int,
  filter_user_id   uuid
)
returns table (
  id            uuid,
  document_id   uuid,
  document_name text,
  content       text,
  similarity    float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    d.name  as document_name,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where
    dc.user_id = filter_user_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Chat Sessions ─────────────────────────────────────────────────────────────
create table if not exists chat_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null default 'New Research Session',
  model_id     text not null default 'gpt-4o-mini',
  temperature  float not null default 0.7,
  total_tokens int not null default 0,
  total_cost   float not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx    on chat_sessions(user_id);
create index if not exists chat_sessions_updated_at_idx on chat_sessions(updated_at desc);

-- ── Chat Messages ─────────────────────────────────────────────────────────────
create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references chat_sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  model_id    text,
  token_count int,
  cost        float,
  feedback    text check (feedback in ('up', 'down')),
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx on chat_messages(session_id);
create index if not exists chat_messages_user_id_idx    on chat_messages(user_id);

-- ── Reports ───────────────────────────────────────────────────────────────────
create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid references chat_sessions(id) on delete set null,
  title        text not null,
  content      text not null,
  format       text not null default 'docx' check (format in ('docx', 'md', 'pdf')),
  storage_path text,
  created_at   timestamptz not null default now()
);

create index if not exists reports_user_id_idx on reports(user_id);

-- ── Citations ─────────────────────────────────────────────────────────────────
create table if not exists citations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  session_id       uuid references chat_sessions(id) on delete set null,
  title            text not null,
  authors          text[] not null default '{}',
  url              text,
  publication_date text,
  publisher        text,
  journal_name     text,
  volume           text,
  issue            text,
  pages            text,
  doi              text,
  source           text not null default 'manual'
                     check (source in ('document', 'web', 'manual')),
  document_id      uuid references documents(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists citations_user_id_idx on citations(user_id);

-- ── Web Search Cache ──────────────────────────────────────────────────────────
-- Caches Tavily results to reduce API costs and improve response speed
create table if not exists search_cache (
  id         uuid primary key default gen_random_uuid(),
  query      text not null unique,
  results    jsonb not null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index if not exists search_cache_query_idx      on search_cache(query);
create index if not exists search_cache_expires_at_idx on search_cache(expires_at);

-- ── User Memory ───────────────────────────────────────────────────────────────
-- Stores persistent insights and preferences across sessions
create table if not exists user_memory (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  content    text not null,
  type       text not null default 'insight'
               check (type in ('insight', 'preference', 'fact')),
  created_at timestamptz not null default now()
);

create index if not exists user_memory_user_id_idx on user_memory(user_id);

-- ── Application Logs ─────────────────────────────────────────────────────────
-- Structured logs for debugging and analytics
create table if not exists logs (
  id          uuid primary key default gen_random_uuid(),
  level       text not null check (level in ('info', 'warn', 'error', 'debug')),
  event       text not null,
  user_id     uuid references auth.users(id) on delete set null,
  session_id  uuid,
  message     text not null,
  metadata    jsonb default '{}',
  duration_ms int,
  created_at  timestamptz not null default now()
);

create index if not exists logs_user_id_idx   on logs(user_id);
create index if not exists logs_event_idx     on logs(event);
create index if not exists logs_created_at_idx on logs(created_at desc);

-- ── Row Level Security (RLS) ──────────────────────────────────────────────────
-- Users can only access their own data

alter table documents       enable row level security;
alter table document_chunks enable row level security;
alter table chat_sessions   enable row level security;
alter table chat_messages   enable row level security;
alter table reports         enable row level security;
alter table citations       enable row level security;
alter table user_memory     enable row level security;
alter table logs            enable row level security;

-- Documents
create policy "Users access own documents"
  on documents for all using (auth.uid() = user_id);

-- Document chunks
create policy "Users access own chunks"
  on document_chunks for all using (auth.uid() = user_id);

-- Chat sessions
create policy "Users access own sessions"
  on chat_sessions for all using (auth.uid() = user_id);

-- Chat messages
create policy "Users access own messages"
  on chat_messages for all using (auth.uid() = user_id);

-- Reports
create policy "Users access own reports"
  on reports for all using (auth.uid() = user_id);

-- Citations
create policy "Users access own citations"
  on citations for all using (auth.uid() = user_id);

-- User memory
create policy "Users access own memory"
  on user_memory for all using (auth.uid() = user_id);

-- Logs (read-only for users, write via service role)
create policy "Users read own logs"
  on logs for select using (auth.uid() = user_id);

-- ── Storage bucket ────────────────────────────────────────────────────────────
-- Run this separately in the Supabase dashboard > Storage
-- insert into storage.buckets (id, name, public) values ('analyst-ai', 'analyst-ai', false);