import { z } from "zod";

/** Variables d'environnement côté serveur, validées une seule fois. */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMMA_MODEL: z.string().default("gemma-4-26b-a4b-it"),
  /** URL alternative de l'API Gemini (proxy d'entreprise, faux serveur de test) */
  GEMINI_BASE_URL: z.string().optional(),
  /** true → les agents renvoient des données simulées (aucun appel API) */
  AI_MOCK: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  /** Quota mensuel de tokens IA par utilisateur */
  AI_MONTHLY_TOKEN_QUOTA: z.coerce.number().int().positive().default(2_000_000),
  /** Plafond de tokens pour UNE analyse complète (protège le budget IA) */
  AI_RUN_TOKEN_LIMIT: z.coerce.number().int().positive().default(400_000),
  /** Durée du cache des réponses IA identiques au sein d'une analyse (secondes). 0 = désactivé */
  AI_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(7 * 86_400),
  /** Clé API de recherche web (Analyste). Absente → « analyse non vérifiée » */
  SEARCH_API_KEY: z.string().optional().default(""),
  SESSION_DAYS: z.coerce.number().int().positive().default(30),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;
export function env(): Env {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
