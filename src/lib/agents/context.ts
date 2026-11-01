import type { Brainstorm } from "@/generated/prisma/client";
import { DATA_RULE, dataBlock } from "@/lib/ai/untrusted";

/** Résumé lisible du contexte utilisateur, injecté dans chaque prompt (bloc de données). */
export function describeContext(b: Brainstorm): string {
  const lines = [
    `Zone : ${[b.city, b.country].filter(Boolean).join(", ") || "non précisée"}${b.zone ? ` (${b.zone})` : ""}`,
    `Secteur : ${[b.sector, b.subSector].filter(Boolean).join(" / ") || "tous secteurs"}`,
    b.knownProblem && `Problème connu : ${b.knownProblem}`,
    b.description && `Description : ${b.description}`,
    `Budget maximal : ${b.budgetMaxMad != null ? `${b.budgetMaxMad} DH (MAD)` : "non précisé"}`,
    `Délai : ${b.deadlineDays != null ? `${b.deadlineDays} jours` : "non précisé"}`,
    b.teamSize && `Équipe : ${b.teamSize} personne(s)${b.availability ? `, ${b.availability}` : ""}`,
    b.skills.length && `Compétences : ${b.skills.join(", ")}`,
    b.targetAudience && `Public cible : ${b.targetAudience}`,
    b.marketType && `Marché : ${b.marketType}`,
    b.extra && `Paramètres avancés : ${JSON.stringify(withoutDecision(b.extra))}`,
  ];
  return dataBlock("contexte_utilisateur", lines.filter(Boolean).join("\n"));
}

/** La décision d'une analyse précédente ne doit pas influencer la suivante. */
function withoutDecision(extra: unknown) {
  if (!extra || typeof extra !== "object") return extra;
  const copy = { ...(extra as Record<string, unknown>) };
  delete copy.decision;
  return copy;
}

export const COMMON_RULES = `Règles communes NexBrain :
- Rédige en français.
- N'invente JAMAIS de statistique, de chiffre local, de prix ou de source.
- Distingue toujours : FACT (fait sourcé avec URL), ESTIMATE (estimation avec hypothèses), HYPOTHESIS (à vérifier sur le terrain), CONSTRAINT (contrainte utilisateur).
- Un élément sans source vérifiable est une HYPOTHESIS, jamais un FACT.
- ${DATA_RULE}`;
