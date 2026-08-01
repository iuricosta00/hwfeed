# hwfeed — versão simples (sem login, atualiza de hora em hora)

## O que já está pronto
- Projeto Supabase `hwfeed` já existe, tabela `news_items` já criada
- Leitura pública já liberada (sem necessidade de login)
- `index.html` já vem com a URL e chave preenchidas

## O que você precisa fazer (4 passos)

### 1. Substituir os arquivos no seu repositório GitHub
Substitua TUDO no repositório `hwfeed` pelo conteúdo desta pasta (`index.html`,
`.github/`, `scripts/`). Pode apagar tudo que tinha antes e subir isso no lugar.

```bash
git add -A
git commit -m "versao simplificada sem login"
git push
```

### 2. Configurar os secrets do GitHub Actions
No repositório: **Settings → Secrets and variables → Actions → New repository secret**

| Nome | Valor |
|---|---|
| `GROQ_API_KEY` | sua chave grátis em console.groq.com → API Keys |
| `SUPABASE_URL` | `https://lcmrdrmmcavrphdobuoj.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → projeto hwfeed → Project Settings → API → `service_role` |

### 3. Rodar a coleta pela primeira vez
No repositório: aba **Actions** → "Buscar noticias de hora em hora" → **Run workflow**
→ botão verde **Run workflow**. Espere terminar (ícone verde ✓).

### 4. Publicar o site com GitHub Pages
No repositório: **Settings → Pages**
- **Source**: Deploy from a branch
- **Branch**: `main` / `(root)`
- Salvar

Em 1-2 minutos o site fica em: `https://iuricosta00.github.io/hwfeed/`

---

## Por que troquei o Render pelo GitHub Pages
O Render tem campos de configuração (Root Directory, Build Command, Publish
Directory) que causaram os problemas que tivemos. O GitHub Pages não tem
nenhum desses campos — ele só publica o que está no repositório, sem
configuração nenhuma pra errar.

## Sem autenticação — é seguro?
Sim, dentro do razoável: a tabela só tem notícias públicas de tecnologia (nada
sensível), e ninguém escreve nela além do GitHub Actions (que usa a chave
secreta `service_role`, nunca exposta no site). Qualquer pessoa com o link
consegue ver o feed, só isso.

## Ajustando o horário
Editar o `cron` em `.github/workflows/fetch-news.yml`. Está em `'0 * * * *'`
(todo hora, no minuto 0). Formato: minuto hora dia mês dia-da-semana.
