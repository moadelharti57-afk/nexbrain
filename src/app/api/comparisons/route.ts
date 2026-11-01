import { NextResponse } from "next/server";
import { ApiError, handler, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { costScore, delayScore, rank, weightedScore } from "@/lib/scoring";
import { comparisonSchema, DEFAULT_WEIGHTS } from "@/lib/validation";

/** Compare 2 à 5 idées avec des pondérations éventuellement personnalisées (sans appel IA). */
export const POST = handler(async (req) => {
  const user = await requireUser();
  const { ideaIds, weights = DEFAULT_WEIGHTS } = await parseBody(req, comparisonSchema);
  const ideas = await db.idea.findMany({
    where: { id: { in: ideaIds }, problem: { brainstorm: { userId: user.id } } },
    include: { techEstimate: true, marketAnalysis: true, score: true, problem: { include: { brainstorm: true } } },
  });
  if (ideas.length !== ideaIds.length) throw new ApiError(404, "Idée introuvable");
  if (ideas.some((i) => !i.techEstimate)) throw new ApiError(422, "Toutes les idées doivent être analysées");

  const rows = ideas.map((i) => {
    const t = i.techEstimate!;
    const b = i.problem.brainstorm;
    const criteria = {
      feasibility: t.feasibility,
      cost: costScore(t.costCentralMad, b.budgetMaxMad),
      delay: delayScore(t.durationMaxDays, b.deadlineDays),
      demand: i.marketAnalysis?.demandScore ?? 50,
      commercial: i.marketAnalysis?.commercialScore ?? 50,
    };
    return {
      id: i.id,
      name: i.name,
      criteria,
      total: weightedScore(criteria, weights),
      blocked: i.score?.blocked ?? false,
      cost: { min: t.costMinMad, central: t.costCentralMad, max: t.costMaxMad },
      duration: { min: t.durationMinDays, max: t.durationMaxDays },
      verified: i.marketAnalysis?.verified ?? false,
    };
  });
  const result = rank(rows);
  const comparison = await db.comparison.create({ data: { userId: user.id, ideaIds, weights, result } });
  return NextResponse.json({ comparison }, { status: 201 });
});
