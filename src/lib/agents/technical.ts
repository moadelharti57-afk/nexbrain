import type { Brainstorm, Idea } from "@/generated/prisma/client";
import { generateJson } from "@/lib/ai/gemma";
import { env } from "@/lib/env";
import { dataBlock } from "@/lib/ai/untrusted";
import { COMMON_RULES, describeContext } from "./context";
import { technicalOutput, type TechnicalOutput } from "./schemas";

/**
 * Agent 04 — Technique : décompose le MVP en tâches et postes de coût.
 * Les totaux (coûts, délais, faisabilité) sont calculés ensuite en TypeScript.
 */
export async function runTechnical(b: Brainstorm, idea: Idea) {
  if (env().AI_MOCK) {
    const data: TechnicalOutput = {
      architecture: "Next.js + API IA + PostgreSQL",
      tasks: [
        { title: "Conception", phase: "Fondations", hoursMin: 4, hoursMax: 8, dependsOn: [] },
        { title: "Auth + DB", phase: "Fondations", hoursMin: 6, hoursMax: 10, dependsOn: ["Conception"] },
        { title: "Intégration IA", phase: "Agents", hoursMin: 8, hoursMax: 16, dependsOn: ["Conception"] },
        { title: "Interface", phase: "Résultats", hoursMin: 8, hoursMax: 14, dependsOn: ["Auth + DB"] },
        { title: "Tests", phase: "Recette", hoursMin: 4, hoursMax: 8, dependsOn: ["Interface", "Intégration IA"] },
      ],
      costLines: [
        { label: "Hébergement", unit: "mois", qty: 1, unitPriceMad: 100 },
        { label: "API IA", unit: "forfait", qty: 1, unitPriceMad: 150 },
        { label: "Nom de domaine", unit: "an", qty: 1, unitPriceMad: 80 },
      ],
      complexity: 2,
      skillsGap: [],
      blockers: [],
      securityNotes: ["Clés API côté serveur uniquement"],
    };
    return { data, usage: { inputTokens: 0, outputTokens: 0, model: "mock" }, attempts: 1 };
  }
  return generateJson({
    schema: technicalOutput,
    system: `Tu es l'agent Technique de NexBrain. Tu décomposes un MVP en tâches concrètes et en postes de coût.\n${COMMON_RULES}\n- Ne calcule PAS de total : fournis seulement les tâches (heures min/max, dépendances par titre) et les postes de coût unitaires en MAD.\n- Un prix unitaire non sourcé est une estimation : indique la date de référence si tu la connais.`,
    prompt: `Contexte :\n${describeContext(b)}\n\nIdée :\n${dataBlock("idee", `${idea.name} — ${idea.pitch}\nFonctionnalités MVP : ${JSON.stringify(idea.mvpFeatures)}`)}\n\nDonne l'architecture, le backlog de tâches, les postes de coût, la complexité (1–5), les compétences manquantes, les blocages et les points de sécurité.`,
    temperature: 0.3,
  });
}
