import { z } from "zod";

// ───────── Auth ─────────
export const registerSchema = z.object({
  email: z.email().max(200).transform((e) => e.toLowerCase()),
  password: z.string().min(8, "8 caractères minimum").max(200),
  /** Facultatif : une chaîne vide (champ laissé vide) vaut « non renseigné ». */
  name: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || undefined),
});
export const loginSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(1).max(200),
});

// ───────── Scoring ─────────
export const weightsSchema = z.object({
  feasibility: z.number().min(0).max(100),
  cost: z.number().min(0).max(100),
  delay: z.number().min(0).max(100),
  demand: z.number().min(0).max(100),
  commercial: z.number().min(0).max(100),
});
export type Weights = z.infer<typeof weightsSchema>;

/** Pondérations initiales proposées (diapositive 18). */
export const DEFAULT_WEIGHTS: Weights = {
  feasibility: 30,
  cost: 25,
  delay: 20,
  demand: 15,
  commercial: 10,
};

// ───────── Brainstorm (assistant en 4 étapes) ─────────
const str = (max: number) => z.string().trim().max(max);

export const brainstormInputSchema = z.object({
  title: str(120).min(1),
  mode: z.enum(["QUICK", "ADVANCED"]).default("QUICK"),
  // 01 Contexte
  city: str(100).optional(),
  country: str(100).optional(),
  sector: str(100).optional(),
  subSector: str(100).optional(),
  knownProblem: str(1000).optional(),
  description: str(2000).optional(),
  // 02 Ressources
  budgetMaxMad: z.number().int().min(0).max(100_000_000).optional(),
  deadlineDays: z.number().int().min(1).max(3650).optional(),
  teamSize: z.number().int().min(1).max(500).optional(),
  availability: str(200).optional(),
  skills: z.array(str(60)).max(30).default([]),
  // 03 Marché / objectifs
  targetAudience: str(300).optional(),
  marketType: z.enum(["B2B", "B2C", "B2G"]).optional(),
  zone: z.enum(["LOCAL", "REGIONAL", "NATIONAL"]).optional(),
  extra: z
    .object({
      projectTypes: z.array(z.enum(["WEB", "MOBILE", "AI", "IOT", "SAAS"])).optional(),
      monetization: str(300).optional(),
      impact: str(300).optional(),
      offline: z.boolean().optional(),
      availableData: str(500).optional(),
      hardware: str(300).optional(),
      apis: str(300).optional(),
      regulation: str(500).optional(),
      priorities: z
        .array(z.enum(["SPEED", "LOW_COST", "IMPACT", "FEASIBILITY", "COMMERCIAL"]))
        .optional(),
    })
    .optional(),
  weights: weightsSchema.optional(),
});
export type BrainstormInput = z.infer<typeof brainstormInputSchema>;

export const brainstormPatchSchema = brainstormInputSchema
  .partial()
  .extend({ status: z.enum(["DRAFT", "ARCHIVED"]).optional() });

export const runRequestSchema = z.object({
  /** Reprendre le workflow à partir d'un agent donné */
  startFrom: z.enum(["EXPLORER", "INNOVATOR", "ANALYST", "TECHNICAL", "DECIDER"]).optional(),
});

export const ideaPatchSchema = z.object({
  favorite: z.boolean().optional(),
  status: z.enum(["CHOSEN", "REJECTED", "TO_VERIFY"]).optional(),
});

export const comparisonSchema = z.object({
  ideaIds: z.array(z.string().min(1)).min(2).max(5),
  weights: weightsSchema.optional(),
});

export const reportSchema = z.object({
  brainstormId: z.string().min(1),
  format: z.enum(["JSON", "MARKDOWN", "PDF"]).default("JSON"),
  version: z.number().int().min(1).optional(),
});
