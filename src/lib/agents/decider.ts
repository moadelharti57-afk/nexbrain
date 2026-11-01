import type { Brainstorm } from "@/generated/prisma/client";
import { generateJson } from "@/lib/ai/gemma";
import { env } from "@/lib/env";
import { dataBlock } from "@/lib/ai/untrusted";
import { COMMON_RULES, describeContext } from "./context";
import { deciderOutput, type DeciderOutput } from "./schemas";

export type ScoredIdea = {
  id: string;
  name: string;
  pitch: string;
  total: number;
  rank: number | null;
  blocked: boolean;
  blockReasons: string[];
  verified: boolean;
  cost: string;
  duration: string;
};

/**
 * Agent 05 — Décideur : rédige l'argumentaire à partir du classement
 * (déjà calculé en TypeScript) sans masquer incertitudes ni risques.
 */
export async function runDecider(b: Brainstorm, ideas: ScoredIdea[]) {
  if (env().AI_MOCK) {
    const data: DeciderOutput = {
      summary: "Classement de démonstration : budget et délai compatibles ; la demande reste à vérifier sur le terrain.",
      insufficientEvidence: ideas.every((i) => !i.verified),
      ideas: ideas.map((i) => ({
        ideaId: i.id,
        rationale: i.blocked ? `Écartée : ${i.blockReasons.join(" ; ")}` : `Score ${i.total}/100, coût ${i.cost}, délai ${i.duration}.`,
        validations: ["Valider le besoin auprès de 10 usagers"],
      })),
    };
    return { data, usage: { inputTokens: 0, outputTokens: 0, model: "mock" }, attempts: 1 };
  }
  const table = ideas
    .map((i) => `- id=${i.id} | ${i.name} | score=${i.total} | rang=${i.rank ?? "écartée"} | coût=${i.cost} | délai=${i.duration} | marché vérifié=${i.verified}${i.blocked ? ` | BLOQUÉE : ${i.blockReasons.join("; ")}` : ""}`)
    .join("\n");
  return generateJson({
    schema: deciderOutput,
    system: `Tu es l'agent Décideur de NexBrain. Le classement et les scores sont DÉJÀ calculés : ne les modifie pas.\n${COMMON_RULES}\n- Rédige un argumentaire honnête : un score élevé ne prouve pas la réussite sur le marché.\n- Si aucune idée n'est suffisamment documentée, mets insufficientEvidence à true et dis-le clairement.`,
    prompt: `Contexte :\n${describeContext(b)}\n\nIdées classées :\n${dataBlock("classement", table, 12000)}\n\nPour chaque idée (même ideaId), donne la justification et les validations restantes. Termine par une synthèse.`,
    temperature: 0.4,
  });
}
