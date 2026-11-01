import { env } from "@/lib/env";

export type SearchResult = { title: string; url: string; snippet: string; publishedAt?: string };

/** Recherche web pour l'agent Analyste. Sans clé → [] (analyse marquée « non vérifiée »). */
export async function searchWeb(query: string, max = 5): Promise<SearchResult[] | null> {
  const key = env().SEARCH_API_KEY;
  if (!key) return null;
  // Fournisseur par défaut : Tavily. Remplaçable par Brave, SerpAPI, etc.
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, max_results: max }),
  });
  if (!res.ok) throw new Error(`Recherche web : HTTP ${res.status}`);
  const json = (await res.json()) as {
    results?: { title: string; url: string; content: string; published_date?: string }[];
  };
  return (json.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 500),
    publishedAt: r.published_date,
  }));
}
