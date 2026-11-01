import { NextResponse } from "next/server";
import { ownIdea } from "@/lib/access";
import { handler, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { ideaPatchSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/ideas/[id]">;

/** Fiche idée complète : marché, technique, tâches, preuves, score. */
export const GET = handler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownIdea(user.id, id);
  const idea = await db.idea.findUnique({
    where: { id },
    include: {
      problem: { select: { id: true, title: true, brainstormId: true } },
      marketAnalysis: true,
      techEstimate: true,
      score: true,
      tasks: { orderBy: { order: "asc" } },
      evidence: true,
    },
  });
  return NextResponse.json({ idea });
});

export const PATCH = handler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownIdea(user.id, id);
  const data = await parseBody(req, ideaPatchSchema);
  const idea = await db.idea.update({ where: { id }, data });
  return NextResponse.json({ idea });
});
