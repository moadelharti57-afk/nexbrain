import { NextResponse } from "next/server";
import { ownBrainstorm } from "@/lib/access";
import { ApiError, handler, parseBody, rateLimit, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { runQueue } from "@/lib/queue";
import { runRequestSchema } from "@/lib/validation";

/** Lance (ou relance à partir d'un agent) le workflow des 5 agents. */
export const POST = handler(async (req, ctx: RouteContext<"/api/brainstorms/[id]/run">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const b = await ownBrainstorm(user.id, id);
  await rateLimit(`run:${user.id}`, 10, 3600);
  const { startFrom } = await parseBody(req, runRequestSchema);

  const active = await db.run.findFirst({ where: { brainstormId: id, status: { in: ["QUEUED", "RUNNING"] } } });
  if (active) throw new ApiError(409, "Une exécution est déjà en cours", { runId: active.id });
  if (startFrom && startFrom !== "EXPLORER" && b.status === "DRAFT")
    throw new ApiError(422, "Lancez d'abord une analyse complète");

  const run = await db.run.create({ data: { brainstormId: id, startFrom } });
  const job = await runQueue.add("run", { runId: run.id }, { jobId: run.id });
  await db.run.update({ where: { id: run.id }, data: { jobId: job.id } });
  return NextResponse.json({ run }, { status: 202 });
});
