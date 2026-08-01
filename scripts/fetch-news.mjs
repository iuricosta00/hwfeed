import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const { GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!GROQ_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam variáveis de ambiente (GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const FEEDS = [
  { name: 'Adrenaline', url: 'https://www.adrenaline.com.br/feed/' },
  { name: 'Tecnoblog', url: 'https://tecnoblog.net/feed/' },
  { name: 'Canaltech', url: 'https://canaltech.com.br/rss/' },
  { name: "Tom's Hardware", url: 'https://www.tomshardware.com/feeds/all' },
];

const KEYWORDS = [
  'processador', 'cpu', 'placa de vídeo', 'gpu', 'ssd', 'hd ',
  'placa-mãe', 'placa mãe', 'memória ram', 'ram', 'notebook',
  'hardware', 'intel', 'amd', 'nvidia', 'windows', 'bios',
  'fonte de alimentação', 'gabinete', 'processor', 'graphics card',
];

const HORAS_JANELA = 48;

function itemRelevante(item) {
  const texto = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
  return KEYWORDS.some((k) => texto.includes(k));
}

function dentroDaJanela(item) {
  if (!item.isoDate) return true;
  const publicado = new Date(item.isoDate);
  const horas = (Date.now() - publicado.getTime()) / 1000 / 60 / 60;
  return horas <= HORAS_JANELA;
}

async function coletarItens() {
  const parser = new Parser();
  const coletados = [];

  for (const feed of FEEDS) {
    try {
      const resultado = await parser.parseURL(feed.url);
      for (const item of resultado.items) {
        if (dentroDaJanela(item) && itemRelevante(item)) {
          coletados.push({
            title: item.title,
            snippet: (item.contentSnippet || '').slice(0, 300),
            url: item.link,
            source: feed.name,
            published_at: item.isoDate || null,
          });
        }
      }
    } catch (err) {
      console.error(`Erro lendo feed ${feed.name}:`, err.message);
    }
  }

  const vistos = new Set();
  return coletados.filter((i) => {
    if (vistos.has(i.url)) return false;
    vistos.add(i.url);
    return true;
  }).slice(0, 20);
}

async function resumirComGroq(itens) {
  if (itens.length === 0) return [];

  const prompt = `Você vai receber uma lista de notícias brutas (título, trecho, fonte, link) sobre
hardware e tecnologia. Selecione apenas as que forem realmente relevantes para um técnico de
informática brasileiro (hardware de PC, componentes, notebooks, novidades de mercado). Ignore
itens fracos, redundantes ou pouco relevantes. No máximo 8 itens.

Para cada item selecionado, escreva um resumo de 1-2 frases em português, na sua própria redação
(não copie o trecho original).

Responda APENAS com um JSON no formato:
{"items": [{"title": "...", "summary": "...", "source": "...", "url": "...", "published_at": "..."}]}

Notícias brutas:
${JSON.stringify(itens, null, 2)}`;

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Erro na API da Groq (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const texto = data.choices?.[0]?.message?.content || '{}';
  const limpo = texto.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(limpo);
    return parsed.items || [];
  } catch (err) {
    console.error('Não consegui interpretar a resposta da Groq:', texto);
    return [];
  }
}

async function salvarNoSupabase(itens) {
  if (itens.length === 0) {
    console.log('Nenhum item novo para salvar.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from('news_items')
    .upsert(itens, { onConflict: 'url', ignoreDuplicates: true });

  if (error) {
    throw new Error(`Erro ao salvar no Supabase: ${error.message}`);
  }

  console.log(`${itens.length} item(ns) salvos/atualizados no Supabase.`);
}

async function main() {
  console.log('Coletando feeds...');
  const brutos = await coletarItens();
  console.log(`${brutos.length} itens brutos relevantes encontrados.`);

  console.log('Resumindo com Groq...');
  const resumidos = await resumirComGroq(brutos);
  console.log(`${resumidos.length} itens selecionados pelo modelo.`);

  await salvarNoSupabase(resumidos);
}

main().catch((err) => {
  console.error('Falha na execução:', err);
  process.exit(1);
});
