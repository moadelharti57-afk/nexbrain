import type { Weights } from "./validation";

/**
 * Scoring multicritère — calculé en TypeScript, jamais par le LLM.
 * Score = Σ(note × poids) / Σ(poids). Les notes sont sur 0–100.
 * Un score n'est pas une probabilité de réussite.
 */
export type CriteriaScores = {
  feasibility: number;
  cost: number;
  delay: number;
  demand: number;
  commercial: number;
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export function weightedScore(scores: CriteriaScores, w: Weights): number {
  const keys = Object.keys(w) as (keyof Weights)[];
  const totalW = keys.reduce((s, k) => s + w[k], 0);
  if (totalW === 0) return 0;
  const sum = keys.reduce((s, k) => s + clamp(scores[k]) * w[k], 0);
  return Math.round(sum / totalW);
}

/**
 * Note d'usage d'une ressource (budget ou délai) selon le ratio estimé / disponible :
 * ratio 0 → 100, ratio 1 (tout le budget / tout le délai) → 50, ratio ≥ 1,5 → 0.
 * Linéaire par morceaux : utiliser toute la ressource reste acceptable mais sans marge.
 */
export function usageScore(ratio: number): number {
  if (ratio <= 1) return Math.round(clamp(100 - 50 * ratio));
  return Math.round(clamp(50 - 100 * (ratio - 1)));
}

/** Note de coût à partir du coût central et du budget (neutre si budget inconnu). */
export function costScore(costCentralMad: number, budgetMaxMad?: number | null): number {
  if (!budgetMaxMad) return 50;
  return usageScore(costCentralMad / budgetMaxMad);
}

/** Note de délai à partir de la durée max estimée et du délai disponible. */
export function delayScore(durationMaxDays: number, deadlineDays?: number | null): number {
  if (!deadlineDays) return 50;
  return usageScore(durationMaxDays / deadlineDays);
}

export type Constraints = { budgetMaxMad?: number | null; deadlineDays?: number | null };
export type EstimateSummary = { costMinMad: number; costMaxMad: number; durationMinDays: number; durationMaxDays: number };

/** Contraintes bloquantes vérifiées avant le classement. */
export function checkConstraints(e: EstimateSummary, c: Constraints) {
  const reasons: string[] = [];
  if (c.budgetMaxMad != null && e.costMinMad > c.budgetMaxMad)
    reasons.push(`Coût minimal (${e.costMinMad} MAD) supérieur au budget (${c.budgetMaxMad} MAD)`);
  if (c.deadlineDays != null && e.durationMinDays > c.deadlineDays)
    reasons.push(`Durée minimale (${e.durationMinDays} j) supérieure au délai (${c.deadlineDays} j)`);
  return { blocked: reasons.length > 0, reasons };
}

export type Rankable = { id: string; total: number; blocked: boolean };

/** Classe les idées non bloquées par score décroissant ; les bloquées n'ont pas de rang. */
export function rank<T extends Rankable>(items: T[]): (T & { rank: number | null })[] {
  const ok = items.filter((i) => !i.blocked).sort((a, b) => b.total - a.total);
  const ranks = new Map(ok.map((i, idx) => [i.id, idx + 1]));
  return items.map((i) => ({ ...i, rank: ranks.get(i.id) ?? null }));
}
