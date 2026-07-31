# hwfeed — painel de notícias de hardware/tech

Site com login que mostra um feed de notícias sobre hardware/PC, coletado automaticamente
todo dia via GitHub Actions (RSS + Groq/Llama, 100% gratuito) e salvo no Supabase.

**Arquitetura:**
- `scripts/fetch-news.mjs` → lê RSS de sites de tech, filtra por palavras-chave, manda pro
  Groq (Llama, grátis) resumir em português, salva no Supabase
- `.github/workflows/fetch-news.yml` → roda o script acima todo dia às 8h (Brasília), na nuvem
- `index.html` → site estático com login (Supabase Auth) que lê as notícias do Supabase
- `supabase/schema.sql` → estrutura da tabela e permissões

Custo: **R$ 0**. GitHub Actions, Supabase e Groq têm tiers gratuitos que sobram pra esse uso.

---

## 1. Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto
2. Vá em **SQL Editor** → cole o conteúdo de `supabase/schema.sql` → Run
3. Vá em **Authentication → Providers** → confirme que "Email" está habilitado
4. Vá em **Authentication → Users** → **Add user** → crie seu usuário (o e-mail/senha que
   você vai usar pra logar no site). Marque "Auto Confirm User".
5. Vá em **Project Settings → API** e anote:
   - `Project URL`
   - `anon public` key (a pública, não a `service_role`)
   - `service_role` key (essa é secreta — só vai pro GitHub Actions, nunca pro site)

## 2. Criar a chave da Groq (gratuita)

1. Crie uma conta em [console.groq.com](https://console.groq.com)
2. Vá em **API Keys** → crie uma chave e copie

## 3. Subir o repositório pro GitHub

```bash
cd news-site
git init
git add .
git commit -m "primeira versão do hwfeed"
gh repo create hwfeed --private --source=. --push
```
(ou crie o repo pelo site do GitHub e faça `git remote add origin ...` + `git push`)

## 4. Configurar os secrets do GitHub Actions

No repositório: **Settings → Secrets and variables → Actions → New repository secret**.
Adicione três:

| Nome | Valor |
|---|---|
| `GROQ_API_KEY` | a chave da Groq |
| `SUPABASE_URL` | a Project URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | a `service_role` key do Supabase |

## 5. Testar a coleta manualmente

No repositório: aba **Actions** → workflow "Buscar notícias diárias" → **Run workflow**.
Depois de rodar, confira no Supabase (Table Editor → `news_items`) se apareceram itens.

Se quiser testar localmente antes:
```bash
cd scripts
npm install
GROQ_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node fetch-news.mjs
```

## 6. Configurar o site

Edite `index.html` e preencha no topo do `<script>`:
```js
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-anon-key-publica';
```
A `anon key` é pública por design (protegida pelas regras de RLS que já estão no
`schema.sql` — só usuário logado consegue ler a tabela). Não use a `service_role` aqui.

Commit e push dessa alteração.

## 7. Publicar no GitHub Pages

No repositório: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)**.
Em alguns minutos o site fica disponível em `https://seu-usuario.github.io/hwfeed/`.

## Ajustando os temas e fontes de notícia

Edite `scripts/fetch-news.mjs`:
- `FEEDS` → lista de feeds RSS (adicione/remova sites)
- `KEYWORDS` → palavras que filtram o que é relevante
- `HORAS_JANELA` → quantas horas pra trás ele considera "notícia recente"

## Ajustando o horário

Edite o `cron` em `.github/workflows/fetch-news.yml` (horário em UTC — Brasília é UTC-3).
