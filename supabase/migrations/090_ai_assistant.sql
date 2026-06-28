-- AI Assistant: RAG knowledge base (documents + pgvector chunks) and chat history.
-- Embeddings: OpenAI text-embedding-3-small (1536 dims) routed via the Vercel AI Gateway.
-- Every table is RLS-scoped to the owning profile, mirroring the rest of the schema.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. pgvector
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ai_documents — one row per uploaded file / URL / pasted note
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_documents (
  id           uuid        primary key default gen_random_uuid(),
  profile_id   uuid        not null references public.profiles(id) on delete cascade,
  title        text        not null,
  source_type  text        not null default 'text' check (source_type in ('upload', 'url', 'text')),
  source_url   text,
  storage_path text,
  status       text        not null default 'processing' check (status in ('processing', 'ready', 'error')),
  error        text,
  chunk_count  integer     not null default 0,
  token_count  integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger ai_documents_updated_at
  before update on public.ai_documents
  for each row execute function public.set_updated_at();

create index if not exists ai_documents_profile_idx
  on public.ai_documents(profile_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ai_document_chunks — embedded text chunks (the vector store)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_document_chunks (
  id          uuid        primary key default gen_random_uuid(),
  document_id uuid        not null references public.ai_documents(id) on delete cascade,
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  chunk_index integer     not null,
  content     text        not null,
  embedding   vector(1536),
  token_count integer     not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists ai_document_chunks_document_idx
  on public.ai_document_chunks(document_id);

-- HNSW index for cosine-distance similarity search.
create index if not exists ai_document_chunks_embedding_idx
  on public.ai_document_chunks using hnsw (embedding vector_cosine_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ai_conversations + ai_messages — chat history
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_conversations (
  id         uuid        primary key default gen_random_uuid(),
  profile_id uuid        not null references public.profiles(id) on delete cascade,
  title      text        not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create index if not exists ai_conversations_profile_idx
  on public.ai_conversations(profile_id, updated_at desc);

create table if not exists public.ai_messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.ai_conversations(id) on delete cascade,
  profile_id      uuid        not null references public.profiles(id) on delete cascade,
  role            text        not null check (role in ('user', 'assistant', 'system')),
  content         text        not null default '',
  citations       jsonb       not null default '[]'::jsonb,
  usage           jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx
  on public.ai_messages(conversation_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — strict per-profile isolation on every table
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.ai_documents       enable row level security;
alter table public.ai_document_chunks enable row level security;
alter table public.ai_conversations   enable row level security;
alter table public.ai_messages        enable row level security;

-- ai_documents
create policy "Users can view own ai_documents"
  on public.ai_documents for select
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can insert own ai_documents"
  on public.ai_documents for insert
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can update own ai_documents"
  on public.ai_documents for update
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can delete own ai_documents"
  on public.ai_documents for delete
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- ai_document_chunks
create policy "Users can view own ai_document_chunks"
  on public.ai_document_chunks for select
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can insert own ai_document_chunks"
  on public.ai_document_chunks for insert
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can delete own ai_document_chunks"
  on public.ai_document_chunks for delete
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- ai_conversations
create policy "Users can view own ai_conversations"
  on public.ai_conversations for select
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can insert own ai_conversations"
  on public.ai_conversations for insert
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can update own ai_conversations"
  on public.ai_conversations for update
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can delete own ai_conversations"
  on public.ai_conversations for delete
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- ai_messages
create policy "Users can view own ai_messages"
  on public.ai_messages for select
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can insert own ai_messages"
  on public.ai_messages for insert
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "Users can delete own ai_messages"
  on public.ai_messages for delete
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Vector similarity search RPC
--    SECURITY INVOKER (default) so the caller's RLS still applies — p_profile_id
--    is an extra guard, not the only one.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count     int  default 5,
  p_profile_id    uuid default null
)
returns table (
  id             uuid,
  document_id    uuid,
  document_title text,
  content        text,
  similarity     float
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    d.title as document_title,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.ai_document_chunks c
  join public.ai_documents d on d.id = c.document_id
  where c.embedding is not null
    and d.status = 'ready'
    and (p_profile_id is null or c.profile_id = p_profile_id)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Private storage bucket for uploaded source files (10 MB cap)
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'ai-documents',
  'ai-documents',
  false,
  10485760,
  array['application/pdf', 'text/plain', 'text/markdown']::text[]
where not exists (select 1 from storage.buckets where id = 'ai-documents');

drop policy if exists "ai_documents_select_own" on storage.objects;
create policy "ai_documents_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'ai-documents' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "ai_documents_insert_own" on storage.objects;
create policy "ai_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ai-documents' and split_part(name, '/', 1) = auth.uid()::text);

drop policy if exists "ai_documents_delete_own" on storage.objects;
create policy "ai_documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ai-documents' and split_part(name, '/', 1) = auth.uid()::text);
