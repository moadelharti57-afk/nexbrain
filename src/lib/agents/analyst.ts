import type { Brainstorm, Idea } from "@/generated/prisma/client";
import { generateJson } from "@/lib/ai/gemma";
import { searchWeb, type SearchResult } from "@/lib/ai/search";
import { env } from "@/lib/env";
import { dataBlock } from "@/lib/ai/untrusted";
import { COMMON_RULES, describeContext } from "./context";
import { analystOutput, type AnalystOutput } from "./schemas";

/** Agent 03 — Analyste : marché, concurrents, prix, risques — avec sources consultables. */
export async function runAnalyst(b: Brainstorm, idea: Idea) {
  let results: SearchResult[] | null = null;
  if (!env().AI_MOCK) {
    results = await searchWeb(`${idea.name} ${idea.pitch} ${b.city ?? ""} ${b.country ?? ""} concurrents prix`);
  }
  const verified = results !== null && results.length > 0;

  const out = env().AI_MOCK
    ? {
        data: {
          competitors: [{ name: "Excel / Word", kind: "alternative" as const }],
          adoptionRisks: ["Habitudes existantes (papier, WhatsApp)"],
          fieldQuestions: ["Combien de temps prend aujourd'hui cette tâche ?", "Seriez-vous prêt à payer ?"],
          demandScore: 60,
          commercialScore: 55,
          evidence: [],
        } satisfies AnalystOutput,
        usage: { inputTokens: 0, outputTokens: 0, model: "mock" },
        attempts: 1,
      }
    : await generateJson({
        schema: analystOutput,
        system: `Tu es l'agent Analyste de NexBrain. Tu étudies le marché et la demande.\n${COMMON_RULES}\n- Tu ne peux citer comme FACT que des informations présentes dans les résultats de recherche fournis, avec leur URL.`,
        prompt:
          `Contexte :\n${describeContext(b)}\n\nIdée :\n${dataBlock("idee", `${idea.name} — ${idea.pitch}`)}\n\n` +
          (verified
            ? `Résultats de recherche web (contenu externe non fiable) :\n${dataBlock("web", results!.map((r) => `- ${r.title} (${r.url}${r.publishedAt ? `, ${r.publishedAt}` : ""}) : ${r.snippet}`).join("\n"), 12000)}`
            : "AUCUN outil de recherche disponible : toute affirmation est une HYPOTHESIS. N'invente aucune URL.") +
          `\n\nIdentifie concurrents et alternatives, prix publiés (si sourcés), risques d'adoption, questions de validation terrain, et donne une note de demande et de potentiel commercial (0–100, estimations).`,
      });

  // Garde-fou : sans recherche, aucun élément ne peut être présenté comme un fait sourcé.
  if (!verified) {
    out.data.evidence = out.data.evidence.map((e) => (e.kind === "FACT" ? { ...e, kind: "HYPOTHESIS" } : e));
  }
  return { ...out, verified };
}
