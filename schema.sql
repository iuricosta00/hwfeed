-- Rode isto no SQL Editor do seu projeto Supabase

create table if not exists news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  source text,
  url text not null unique,
  published_at timestamptz,
  fetched_at timestamptz default now()
);

create index if not exists news_items_published_at_idx
  on news_items (published_at desc);

-- Protege a tabela: só usuários autenticados podem ler.
-- O GitHub Actions escreve usando a service_role key, que ignora RLS.
alter table news_items enable row level security;

create policy "Usuários autenticados podem ler notícias"
  on news_items for select
  using (auth.role() = 'authenticated');
