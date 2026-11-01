import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Analyse en cours, propagée implicitement jusqu'au client IA.
 * Sert à limiter le cache à une même analyse : une reprise après échec réutilise les
 * réponses déjà obtenues, mais une nouvelle analyse demande de nouvelles propositions.
 */
export const runContext = new AsyncLocalStorage<{ runId: string }>();
