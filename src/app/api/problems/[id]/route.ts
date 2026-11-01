import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, notFound, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";

/** Sélection des problèmes à approfondir par l'Innovateur. */
export const PATCH = handler(async (req, ctx: RouteContext<"/api/problems/[id]">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const p = await db.problem.findFirst({ where: { id, brainstorm: { userId: user.id } } });
  if (!p) throw notFound("Problème");
  const { selected } = await parseBody(req, z.object({ selected: z.boolean() }));
  const problem = await db.problem.update({ where: { id }, data: { selected } });
  return NextResponse.json({ problem });
});
