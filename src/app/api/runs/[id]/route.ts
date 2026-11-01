import { NextResponse } from "next/server";
import { z } from "zod";
import { ownRun } from "@/lib/access";
import { ApiError, handler, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { AGENT_ORDER } from "@/lib/orchestrator";
import { runQueue } from "@/lib/queue";

type Ctx = RouteContext<"/api/runs/[id]">;

/** Progression : état du run et de chaque agent. */
export const GET = handler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownRun(user.id, id);
  const run = await db.run.findUniqueOrThrow({
    where: { id },
    include: {
      executions: {
        orderBy: { startedAt: "asc" },
        select: { id: true, agent: true, status: true, attempt: true, inputTokens: true, outputTokens: true, error: true, startedAt: true, finishedAt: true },
      },
    },
  });
  const done = new Set(run.executions.filter((e) => e.status === "SUCCEEDED").map((e) => e.agent));
  const progress = Math.round((AGENT_ORDER.filter((a) => done.has(a)).length / AGENT_ORDER.length) * 100);
  return NextResponse.json({ run, progress });
});

const actionSchema = z.object({ action: z.enum(["retry", "cancel"]) });

/** retry : relance un run échoué (reprise à l'agent en échec). cancel : annule. */
export const POST = handler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const run = await ownRun(user.id, id);
  const { action } = await parseBody(req, actionSchema);

  if (action === "cancel") {
    if (!["QUEUED", "RUNNING"].includes(run.status)) throw new ApiError(409, "Exécution déjà terminée");
    await db.run.update({ where: { id }, data: { status: "CANCELLED", finishedAt: new Date() } });
    const job = await runQueue.getJob(id);
    if (job && (await job.isWaiting())) await job.remove();
    return NextResponse.json({ ok: true });
  }

  if (run.status !== "FAILED") throw new ApiError(409, "Seule une exécution échouée peut être relancée");
  await db.run.update({ where: { id }, data: { status: "QUEUED", error: null, finishedAt: null } });
  const old = await runQueue.getJob(id);
  if (old) await old.remove();
  await runQueue.add("run", { runId: id }, { jobId: id });
  return NextResponse.json({ ok: true }, { status: 202 });
});
