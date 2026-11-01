import type { Brainstorm } from "@/generated/prisma/client";
import { generateJson } from "@/lib/ai/gemma";
import { env } from "@/lib/env";
import { COMMON_RULES, describeContext } from "./context";
import { explorerOutput, type ExplorerOutput } from "./schemas";

/** Agent 01 — Explorateur : repérer les problèmes avant de proposer des solutions. */
export async function runExplorer(b: Brainstorm) {
  const count = b.mode === "ADVANCED" ? 20 : 10;
  if (env().AI_MOCK) return mock(b, count);
  return generateJson({
    schema: explorerOutput,
    system: `Tu es l'agent Explorateur de NexBrain. Tu identifies des problèmes concrets vécus par des usagers, AVANT toute solution.\n${COMMON_RULES}`,
    prompt: `Contexte :\n${describeContext(b)}\n\nFormule ${count} problèmes distincts. Pour chacun : titre, description, usagers concernés, conséquences, fréquence supposée (1–5, c'est une hypothèse), et les éléments de preuve ou questions à vérifier.`,
  });
}

function mock(b: Brainstorm, count: number): { data: ExplorerOutput; usage: { inputTokens: 0; outputTokens: 0; model: "mock" }; attempts: 1 } {
  const base = [
    ["Les artisans perdent du temps à formaliser leurs devis", "Artisans, clients particuliers", "Devis tardifs, clients perdus"],
    ["Les chercheurs d'emploi peinent à rédiger un CV structuré", "Jeunes diplômés", "Candidatures moins visibles"],
    ["Les documents administratifs sont difficiles à comprendre", "Habitants peu familiers du français administratif", "Démarches abandonnées ou erronées"],
    ["Les petits commerces suivent mal leurs stocks", "Épiceries, boutiques", "Ruptures et pertes"],
    ["Les patients oublient leurs rendez-vous médicaux", "Patients, cabinets", "Créneaux perdus"],
  ];
  const problems = Array.from({ length: Math.min(count, base.length) }, (_, i) => ({
    title: base[i][0],
    description: `${base[i][0]}${b.city ? ` à ${b.city}` : ""} (scénario de démonstration).`,
    affectedUsers: base[i][1],
    consequences: base[i][2],
    frequency: 5 - (i % 3),
    evidence: [{ kind: "HYPOTHESIS" as const, statement: "Fréquence supposée, non vérifiée", validation: "Interroger 10 usagers concernés" }],
  }));
  return { data: { problems }, usage: { inputTokens: 0, outputTokens: 0, model: "mock" }, attempts: 1 };
}
