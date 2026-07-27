import { config } from "../config.js";
import { logger } from "../logger.js";

export interface NewsArticle {
  title: string;
  description: string | null;
  source: string;
  publishedAt: string;
}

// Portais de agro confiáveis no Brasil — restringe a busca a essas fontes em
// vez de notícia genérica de qualquer lugar da web, pra manter a qualidade
// (relevância pro público real) do que vira mensagem.
const AGRO_DOMAINS = [
  "canalrural.com.br",
  "noticiasagricolas.com.br",
  "globorural.globo.com",
  "agrolink.com.br",
  "cnabrasil.org.br",
  "embrapa.br",
].join(",");

// Termos genéricos do agro sempre incluídos via OR — o hint do tema entra
// como mais uma opção, não como filtro obrigatório. Antes, quando havia
// hint, ele SUBSTITUÍA esses termos e virava uma busca por frase exata —
// combinado com o filtro de domínio (só 6 sites), quase sempre voltava
// vazio. Assim, qualquer um dos termos (ou o hint) já basta pra achar algo.
const GENERAL_AGRO_QUERY = 'agronegócio OR agricultura OR "máquinas agrícolas" OR safra OR colheita OR trator';

interface NewsApiArticle {
  title: string;
  description: string | null;
  publishedAt: string;
  source: { name: string };
}

interface NewsApiResponse {
  status: string;
  articles?: NewsApiArticle[];
}

// Busca novidades recentes do agro na newsapi.org, restrita aos domínios em
// AGRO_DOMAINS. Nunca lança erro — sem chave configurada, sem resultado ou
// com falha de rede/quota, retorna lista vazia e quem chamou cai de volta no
// comportamento sem notícia (ver buildPrompt em content-generator.ts).
export async function fetchAgroNews(topicHint?: string | null): Promise<NewsArticle[]> {
  if (!config.newsApiKey) {
    logger.warn("NEWS_API_KEY não configurada — geração com busca vai seguir sem notícias reais.");
    return [];
  }

  const hint = topicHint?.trim();
  const q = hint ? `${hint} OR ${GENERAL_AGRO_QUERY}` : GENERAL_AGRO_QUERY;

  const params = new URLSearchParams({
    q,
    domains: AGRO_DOMAINS,
    language: "pt",
    sortBy: "publishedAt",
    pageSize: "5",
  });

  try {
    const res = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
      headers: { "X-Api-Key": config.newsApiKey },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn({ status: res.status, body }, "Falha ao buscar notícias do agro — seguindo sem elas.");
      return [];
    }

    const data = (await res.json()) as NewsApiResponse;

    const articles = (data.articles ?? [])
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a) => ({
        title: a.title,
        description: a.description,
        source: a.source?.name ?? "desconhecida",
        publishedAt: a.publishedAt,
      }));

    logger.info({ count: articles.length, query: params.get("q") }, "Busca de notícias do agro concluída.");

    return articles;
  } catch (err) {
    logger.warn({ err }, "Erro ao buscar notícias do agro — seguindo sem elas.");
    return [];
  }
}
