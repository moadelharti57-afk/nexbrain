import type { AgentName, Brainstorm, Prisma } from "@/generated/prisma/client";
import { runAnalyst } from "@/lib/agents/analyst";
import { runDecider, type ScoredIdea } from "@/lib/agents/decider";
import { runExplorer } from "@/lib/agents/explorer";
import { runInnovator } from "@/lib/agents/innovator";
import { runTechnical } from "@/lib/agents/technical";
import type { Usage } from "@/lib/ai/gemma";
import { runContext } from "@/lib/ai/run-context";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { DEFAULT_ESTIMATE_PARAMS, estimate } from "@/lib/estimate";
import { checkConstraints, costScore, delayScore, rank, weightedScore } from "@/lib/scoring";
import { DEFAULT_WEIGHTS, weightsSchema } from "@/lib/validation";

/**
 * Orchestrateur : organise les dépendances et les reprises entre les 5 agents.
 * Ce n'est pas un 6e agent métier — il ne fait aucun appel IA lui-même.
 *
 *   Explorateur → Innovateur → (Analyste ‖ Technique) → Décideur
 */
export const AGENT_ORDER: AgentName[] = ["EXPLORER", "INNOVATOR", "ANALYST", "TECHNICAL", "DECIDER"];

/** Nombre de problèmes approfondis par l'Innovateur si l'utilisateur n'en a pas choisi. */
const AUTO_SELECTED_PROBLEMS = 3;
/** Nombre maximal d'idées envoyées à l'Analyste et à l'agent Technique (maîtrise du coût IA). */
const MAX_ANALYZED_IDEAS = 6;

export class RunCancelled extends Error {}
/** Quota ou plafond atteint : inutile de retenter automatiquement. */
export class QuotaExceeded extends Error {}

type AgentResult<T> = { data: T; usage: Usage; attempts: number };

async function assertQuota(userId: string) {
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const agg = await db.usageRecord.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { inputTokens: true, outputTokens: true },
  });
  const used = (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
  if (used >= env().AI_MONTHLY_TOKEN_QUOTA) throw new QuotaExceeded("Quota IA mensuel atteint");
}

/** Plafond de tokens par analyse : stoppe un workflow qui consommerait anormalement. */
async function assertRunBudget(runId: string) {
  const agg = await db.agentExecution.aggregate({ where: { runId }, _sum: { inputTokens: true, outputTokens: true } });
  const used = (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
  if (used >= env().AI_RUN_TOKEN_LIMIT) throw new QuotaExceeded(`Plafond de tokens de l'analyse atteint (${used.toLocaleString("fr-FR")})`);
}

async function assertNotCancelled(runId: string) {
  const run = await db.run.findUniqueOrThrow({ where: { id: runId }, select: { status: true } });
  if (run.status === "CANCELLED") throw new RunCancelled();
}

/** Exécute un agent en traçant l'exécution (état, tokens, logs) et l'usage. */
async function trace<T>(
  runId: string,
  userId: string,
  agent: AgentName,
  fn: (log: (m: string) => void) => Promise<AgentResult<T>>,
  ideaId?: string,
): Promise<T> {
  await assertNotCancelled(runId);
  await assertQuota(userId);
  await assertRunBudget(runId);
  await db.run.update({ where: { id: runId }, data: { currentAgent: agent } });
  const prev = await db.agentExecution.count({ where: { runId, agent, ideaId: ideaId ?? null } });
  const exec = await db.agentExecution.create({
    data: { runId, agent, ideaId, status: "RUNNING", attempt: prev + 1, startedAt: new Date() },
  });
  const logs: string[] = [];
  const log = (m: string) => logs.push(`${new Date().toISOString()} ${m}`);
  try {
    const res = await fn(log);
    await db.$transaction([
      db.agentExecution.update({
        where: { id: exec.id },
        data: {
          status: "SUCCEEDED",
          model: res.usage.model,
          inputTokens: res.usage.inputTokens,
          outputTokens: res.usage.outputTokens,
          output: res.data as Prisma.InputJsonValue,
          logs,
          finishedAt: new Date(),
        },
      }),
      db.usageRecord.create({
        data: { userId, agent, model: res.usage.model, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens },
      }),
    ]);
    return res.data;
  } catch (err) {
    await db.agentExecution.update({
      where: { id: exec.id },
      data: { status: "FAILED", error: (err as Error).message, logs, finishedAt: new Date() },
    });
    throw err;
  }
}

/** Supprime les résultats produits à partir de l'agent `from` (pour une reprise propre). */
async function resetFrom(b: Brainstorm, from: AgentName) {
  const ideaWhere = { problem: { brainstormId: b.id } };
  switch (from) {
    case "EXPLORER":
      await db.problem.deleteMany({ where: { brainstormId: b.id } });
      break;
    case "INNOVATOR":
      await db.idea.deleteMany({ where: ideaWhere });
      break;
    case "ANALYST":
    case "TECHNICAL":
      await db.$transaction([
        db.marketAnalysis.deleteMany({ where: { idea: ideaWhere } }),
        db.techEstimate.deleteMany({ where: { idea: ideaWhere } }),
        db.task.deleteMany({ where: { idea: ideaWhere } }),
        db.evidence.deleteMany({ where: { idea: ideaWhere } }),
        db.score.deleteMany({ where: { idea: ideaWhere } }),
      ]);
      break;
    case "DECIDER":
      await db.score.deleteMany({ where: { idea: ideaWhere } });
      break;
  }
}

/**
 * @param opts.finalAttempt false → l'échec sera retenté automatiquement par BullMQ :
 *        le run reste QUEUED au lieu de passer FAILED.
 */
export async function executeRun(runId: string, opts: { finalAttempt?: boolean } = {}) {
  return runContext.run({ runId }, () => executeRunInner(runId, opts.finalAttempt ?? true));
}

async function executeRunInner(runId: string, finalAttempt: boolean) {
  const run = await db.run.findUniqueOrThrow({ where: { id: runId }, include: { brainstorm: true } });
  if (run.status === "CANCELLED" || run.status === "SUCCEEDED") return;
  const b = run.brainstorm;
  const userId = b.userId;

  // Reprise : on repart du dernier agent échoué, sinon de startFrom, sinon du début.
  const lastFailed = await db.agentExecution.findFirst({
    where: { runId, status: "FAILED" },
    orderBy: { startedAt: "desc" },
  });
  const from = lastFailed?.agent ?? run.startFrom ?? "EXPLORER";
  const fromIdx = AGENT_ORDER.indexOf(from);
  const shouldRun = (a: AgentName) => AGENT_ORDER.indexOf(a) >= fromIdx;

  await db.$transaction([
    db.run.update({ where: { id: runId }, data: { status: "RUNNING", startedAt: run.startedAt ?? new Date(), error: null } }),
    db.brainstorm.update({ where: { id: b.id }, data: { status: "RUNNING" } }),
  ]);
  // Analyste et Technique forment une seule étape : on réinitialise les deux ensemble.
  await resetFrom(b, from === "TECHNICAL" ? "ANALYST" : from);

  try {
    // ── 01 Explorateur ──
    if (shouldRun("EXPLORER")) {
      const out = await trace(runId, userId, "EXPLORER", () => runExplorer(b));
      for (const p of out.problems) {
        await db.problem.create({
          data: {
            brainstormId: b.id,
            title: p.title,
            description: p.description,
            affectedUsers: p.affectedUsers,
            consequences: p.consequences,
            frequency: p.frequency,
            evidence: { create: p.evidence.map(toEvidence) },
          },
        });
      }
    }

    // ── 02 Innovateur ──
    if (shouldRun("INNOVATOR")) {
      let problems = await db.problem.findMany({ where: { brainstormId: b.id, selected: true } });
      if (problems.length === 0) {
        problems = await db.problem.findMany({
          where: { brainstormId: b.id },
          orderBy: [{ frequency: "desc" }, { createdAt: "asc" }],
          take: AUTO_SELECTED_PROBLEMS,
        });
        await db.problem.updateMany({ where: { id: { in: problems.map((p) => p.id) } }, data: { selected: true } });
      }
      if (problems.length === 0) throw new Error("Aucun problème à approfondir");
      const out = await trace(runId, userId, "INNOVATOR", () => runInnovator(b, problems));
      for (const idea of out.ideas) {
        const problem = problems[idea.problemIndex];
        if (!problem) continue;
        await db.idea.create({
          data: {
            problemId: problem.id,
            name: idea.name,
            pitch: idea.pitch,
            aiValue: idea.aiValue,
            businessModel: idea.businessModel,
            mvpFeatures: idea.mvpFeatures,
          },
        });
      }
    }

    const ideas = await db.idea.findMany({
      where: { problem: { brainstormId: b.id }, status: { not: "REJECTED" } },
      orderBy: { createdAt: "asc" },
      take: MAX_ANALYZED_IDEAS,
    });

    // ── 03 Analyste ‖ 04 Technique (en parallèle, idée par idée) ──
    if (shouldRun("ANALYST") || shouldRun("TECHNICAL")) {
      const params = { ...DEFAULT_ESTIMATE_PARAMS, teamSize: b.teamSize ?? 1 };
      await Promise.all(
        ideas.map(async (idea) => {
          const [market, tech] = await Promise.all([
            trace(runId, userId, "ANALYST", async (log) => {
              const r = await runAnalyst(b, idea);
              log(r.verified ? "Recherche web utilisée" : "Analyse non vérifiée (aucun outil de recherche)");
              return { ...r, data: { ...r.data, verified: r.verified } };
            }, idea.id),
            trace(runId, userId, "TECHNICAL", () => runTechnical(b, idea), idea.id),
          ]);

          const est = estimate(tech.tasks, tech.costLines, params);
          // Faisabilité calculée en TS : complexité, blocages et compétences manquantes.
          const feasibility = Math.max(
            0,
            100 - (tech.complexity - 1) * 12 - tech.blockers.length * 10 - tech.skillsGap.length * 8,
          );

          await db.$transaction([
            db.marketAnalysis.create({
              data: {
                ideaId: idea.id,
                competitors: market.competitors,
                adoptionRisks: market.adoptionRisks,
                fieldQuestions: market.fieldQuestions,
                demandScore: market.demandScore,
                commercialScore: market.commercialScore,
                verified: market.verified,
              },
            }),
            db.techEstimate.create({
              data: {
                ideaId: idea.id,
                architecture: tech.architecture,
                costLines: tech.costLines,
                ...est,
                feasibility,
                blockers: tech.blockers,
                securityNotes: tech.securityNotes,
              },
            }),
            db.task.createMany({
              data: tech.tasks.map((t, order) => ({ ideaId: idea.id, ...t, order })),
            }),
            db.evidence.createMany({ data: market.evidence.map((e) => ({ ...toEvidence(e), ideaId: idea.id })) }),
            db.idea.update({ where: { id: idea.id }, data: { status: "ANALYZED" } }),
          ]);
        }),
      );
    }

    // ── 05 Décideur ──
    if (shouldRun("DECIDER")) {
      const scored = await scoreBrainstorm(b);
      const out = await trace(runId, userId, "DECIDER", () => runDecider(b, scored));
      for (const r of out.ideas) {
        const s = scored.find((i) => i.id === r.ideaId);
        if (!s) continue;
        await db.score.update({
          where: { ideaId: s.id },
          data: { rationale: [r.rationale, ...r.validations.map((v) => `• ${v}`)].join("\n") },
        });
      }
      await db.brainstorm.update({
        where: { id: b.id },
        data: { extra: { ...((b.extra as object) ?? {}), decision: out } as Prisma.InputJsonValue },
      });
    }

    await finalize(runId, b.id);
  } catch (err) {
    if (err instanceof RunCancelled) {
      await db.brainstorm.update({ where: { id: b.id }, data: { status: "DRAFT" } });
      return;
    }
    const final = finalAttempt || err instanceof QuotaExceeded;
    await db.$transaction([
      db.run.update({
        where: { id: runId },
        data: final
          ? { status: "FAILED", error: (err as Error).message, finishedAt: new Date() }
          : { status: "QUEUED", error: (err as Error).message },
      }),
      db.brainstorm.update({ where: { id: b.id }, data: { status: final ? "FAILED" : "RUNNING" } }),
    ]);
    throw err;
  }
}

/** Calcule et enregistre les scores pondérés + classement (aucun appel IA). */
export async function scoreBrainstorm(b: Brainstorm): Promise<ScoredIdea[]> {
  const weights = weightsSchema.safeParse(b.weights).data ?? DEFAULT_WEIGHTS;
  const ideas = await db.idea.findMany({
    where: { problem: { brainstormId: b.id }, techEstimate: { isNot: null } },
    include: { techEstimate: true, marketAnalysis: true },
  });

  const computed = ideas.map((i) => {
    const t = i.techEstimate!;
    const criteria = {
      feasibility: t.feasibility,
      cost: costScore(t.costCentralMad, b.budgetMaxMad),
      delay: delayScore(t.durationMaxDays, b.deadlineDays),
      demand: i.marketAnalysis?.demandScore ?? 50,
      commercial: i.marketAnalysis?.commercialScore ?? 50,
    };
    const { blocked, reasons } = checkConstraints(t, b);
    return { id: i.id, idea: i, criteria, total: weightedScore(criteria, weights), blocked, blockReasons: reasons };
  });
  const ranked = rank(computed);

  await db.$transaction(
    ranked.map((r) =>
      db.score.upsert({
        where: { ideaId: r.id },
        create: { ideaId: r.id, ...r.criteria, total: r.total, weights, blocked: r.blocked, blockReasons: r.blockReasons, rank: r.rank },
        update: { ...r.criteria, total: r.total, weights, blocked: r.blocked, blockReasons: r.blockReasons, rank: r.rank },
      }),
    ),
  );
  await db.$transaction(
    ranked.map((r) =>
      db.idea.update({
        where: { id: r.id },
        data: {
          status: r.blocked ? "REJECTED" : r.idea.marketAnalysis?.verified ? "WITHIN_CONSTRAINTS" : "TO_VERIFY",
        },
      }),
    ),
  );

  return ranked.map((r) => ({
    id: r.id,
    name: r.idea.name,
    pitch: r.idea.pitch,
    total: r.total,
    rank: r.rank,
    blocked: r.blocked,
    blockReasons: r.blockReasons,
    verified: r.idea.marketAnalysis?.verified ?? false,
    cost: `${r.idea.techEstimate!.costMinMad}–${r.idea.techEstimate!.costMaxMad} DH`,
    duration: `${r.idea.techEstimate!.durationMinDays}–${r.idea.techEstimate!.durationMaxDays} j`,
  }));
}

/** Fige un instantané versionné (contexte + résultats + critères + date). */
async function finalize(runId: string, brainstormId: string) {
  const full = await db.brainstorm.findUniqueOrThrow({
    where: { id: brainstormId },
    include: {
      problems: {
        include: {
          evidence: true,
          ideas: { include: { marketAnalysis: true, techEstimate: true, score: true, tasks: true, evidence: true } },
        },
      },
    },
  });
  const version = full.version;
  await db.$transaction([
    db.brainstormVersion.upsert({
      where: { brainstormId_version: { brainstormId, version } },
      create: { brainstormId, version, snapshot: JSON.parse(JSON.stringify(full)) },
      update: { snapshot: JSON.parse(JSON.stringify(full)) },
    }),
    db.brainstorm.update({ where: { id: brainstormId }, data: { status: "COMPLETED", version: version + 1 } }),
    db.run.update({ where: { id: runId }, data: { status: "SUCCEEDED", currentAgent: null, finishedAt: new Date() } }),
  ]);
}

function toEvidence(e: {
  kind: "FACT" | "ESTIMATE" | "HYPOTHESIS" | "CONSTRAINT";
  statement: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceDate?: string;
  excerpt?: string;
  validation?: string;
}) {
  const date = e.sourceDate ? new Date(e.sourceDate) : undefined;
  return {
    kind: e.kind,
    statement: e.statement,
    sourceUrl: e.sourceUrl,
    sourceTitle: e.sourceTitle,
    excerpt: e.excerpt,
    validation: e.validation,
    sourceDate: date && !isNaN(date.getTime()) ? date : undefined,
  };
}
