import type { Brainstorm, Problem } from "@/generated/prisma/client";
import { generateJson } from "@/lib/ai/gemma";
import { env } from "@/lib/env";
import { dataBlock } from "@/lib/ai/untrusted";
import { COMMON_RULES, describeContext } from "./context";
import { innovatorOutput } from "./schemas";

/** Agent 02 — Innovateur : 2–3 solutions distinctes par problème, avec MVP minimal. */
export async function runInnovator(b: Brainstorm, problems: Problem[]) {
  if (env().AI_MOCK) {
    return {
      data: {
        ideas: problems.flatMap((p, i) => [
          { problemIndex: i, name: `Nex${i + 1}A`, pitch: `Solution vocale pour : ${p.title}`, aiValue: "Extraction de champs structurés depuis la voix", businessModel: "Abonnement mensuel", mvpFeatures: ["Upload vocal", "Extraction", "Export PDF"] },
          { problemIndex: i, name: `Nex${i + 1}B`, pitch: `Assistant guidé pour : ${p.title}`, aiValue: "Génération de documents à partir d'un entretien", businessModel: "Paiement à l'usage", mvpFeatures: ["Questionnaire", "Génération", "Partage"] },
        ]),
      },
      usage: { inputTokens: 0, outputTokens: 0, model: "mock" },
      attempts: 1,
    };
  }
  const list = problems.map((p, i) => `[${i}] ${p.title} — ${p.description}`).join("\n");
  return generateJson({
    schema: innovatorOutput,
    system: `Tu es l'agent Innovateur de NexBrain. Tu transformes chaque problème en 2 à 3 solutions réellement distinctes.\n${COMMON_RULES}\n- Ajouter un simple chatbot n'est PAS une innovation suffisante : explique la vraie valeur de l'IA.\n- Chaque MVP doit être réalisable avec le budget, le délai et les compétences indiqués.`,
    prompt: `Contexte :\n${describeContext(b)}\n\nProblèmes (index entre crochets) :\n${dataBlock("problemes", list)}\n\nPour chaque problème, propose 2 à 3 idées (problemIndex = index du problème).`,
  });
}
