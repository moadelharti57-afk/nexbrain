/**
 * Estimation des coûts et délais — calculée en TypeScript à partir des tâches
 * proposées par l'agent Technique (le LLM ne fournit que la décomposition).
 */
export type EstTask = { title: string; hoursMin: number; hoursMax: number; dependsOn: string[] };
export type CostLine = { label: string; unit: string; qty: number; unitPriceMad: number; priceDate?: string };

export type EstimateParams = {
  /** Coût horaire interne retenu (MAD/h). 0 pour une équipe bénévole. */
  hourlyRateMad: number;
  teamSize: number;
  /** Heures productives par personne et par jour */
  hoursPerDay: number;
  /** Marge pour tests et imprévus (0.15 = 15 %) */
  contingency: number;
};

export const DEFAULT_ESTIMATE_PARAMS: EstimateParams = {
  hourlyRateMad: 0,
  teamSize: 1,
  hoursPerDay: 6,
  contingency: 0.15,
};

/** Longueur du chemin critique (en heures), en tenant compte des dépendances. */
export function criticalPathHours(tasks: EstTask[], pick: (t: EstTask) => number): number {
  const byTitle = new Map(tasks.map((t) => [t.title, t]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const finish = (t: EstTask): number => {
    if (memo.has(t.title)) return memo.get(t.title)!;
    if (visiting.has(t.title)) return pick(t); // cycle : on l'ignore
    visiting.add(t.title);
    const start = Math.max(0, ...t.dependsOn.map((d) => byTitle.get(d)).filter(Boolean).map((d) => finish(d!)));
    visiting.delete(t.title);
    const f = start + pick(t);
    memo.set(t.title, f);
    return f;
  };
  return Math.max(0, ...tasks.map(finish));
}

/**
 * Durée calendaire ≠ somme des heures / nombre de personnes :
 * on prend le max entre le chemin critique et la charge répartie.
 */
export function durationDays(tasks: EstTask[], p: EstimateParams, pick: (t: EstTask) => number): number {
  const total = tasks.reduce((s, t) => s + pick(t), 0);
  const parallel = total / Math.max(1, p.teamSize);
  const critical = criticalPathHours(tasks, pick);
  return Math.max(1, Math.ceil((Math.max(parallel, critical) * (1 + p.contingency)) / p.hoursPerDay));
}

export function estimate(tasks: EstTask[], costLines: CostLine[], p: EstimateParams = DEFAULT_ESTIMATE_PARAMS) {
  const fixed = costLines.reduce((s, l) => s + l.qty * l.unitPriceMad, 0);
  const hMin = tasks.reduce((s, t) => s + t.hoursMin, 0);
  const hMax = tasks.reduce((s, t) => s + t.hoursMax, 0);
  const labourMin = hMin * p.hourlyRateMad;
  const labourMax = hMax * p.hourlyRateMad;
  const costMinMad = Math.round(fixed + labourMin);
  const costMaxMad = Math.round((fixed + labourMax) * (1 + p.contingency));
  const costCentralMad = Math.round((costMinMad + costMaxMad) / 2);
  return {
    costMinMad,
    costCentralMad,
    costMaxMad,
    durationMinDays: durationDays(tasks, { ...p, contingency: 0 }, (t) => t.hoursMin),
    durationMaxDays: durationDays(tasks, p, (t) => t.hoursMax),
  };
}

export type ScheduledTask = EstTask & { startDay: number; endDay: number };

/**
 * Planning au plus tôt (en jours) : une tâche démarre quand ses dépendances sont finies.
 * Hypothèse : les tâches indépendantes peuvent avancer en parallèle (équipe ≥ 2).
 */
export function schedule(tasks: EstTask[], hoursPerDay = DEFAULT_ESTIMATE_PARAMS.hoursPerDay, pick: (t: EstTask) => number = (t) => (t.hoursMin + t.hoursMax) / 2): ScheduledTask[] {
  const byTitle = new Map(tasks.map((t) => [t.title, t]));
  const end = new Map<string, number>();
  const visiting = new Set<string>();
  const finish = (t: EstTask): number => {
    if (end.has(t.title)) return end.get(t.title)!;
    if (visiting.has(t.title)) return 0;
    visiting.add(t.title);
    const start = Math.max(0, ...t.dependsOn.map((d) => byTitle.get(d)).filter(Boolean).map((d) => finish(d!)));
    visiting.delete(t.title);
    const f = start + pick(t);
    end.set(t.title, f);
    return f;
  };
  return tasks.map((t) => {
    const f = finish(t);
    return { ...t, startDay: (f - pick(t)) / hoursPerDay, endDay: f / hoursPerDay };
  });
}
