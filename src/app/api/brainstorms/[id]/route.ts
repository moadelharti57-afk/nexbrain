import { NextResponse } from "next/server";
import { ownBrainstorm } from "@/lib/access";
import { ApiError, handler, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { brainstormPatchSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/brainstorms/[id]">;

export const GET = handler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownBrainstorm(user.id, id);
  const brainstorm = await db.brainstorm.findUnique({
    where: { id },
    include: {
      problems: {
        orderBy: { createdAt: "asc" },
        include: {
          evidence: true,
          ideas: { include: { score: true, techEstimate: true, marketAnalysis: true } },
        },
      },
      runs: { orderBy: { createdAt: "desc" }, take: 1, include: { executions: true } },
      versions: { select: { version: true, createdAt: true }, orderBy: { version: "desc" } },
    },
  });
  return NextResponse.json({ brainstorm });
});

export const PATCH = handler(async (req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const current = await ownBrainstorm(user.id, id);
  if (current.status === "RUNNING") throw new ApiError(409, "Analyse en cours : modification impossible");
  const data = await parseBody(req, brainstormPatchSchema);
  const brainstorm = await db.brainstorm.update({ where: { id }, data });
  return NextResponse.json({ brainstorm });
});

export const DELETE = handler(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await ownBrainstorm(user.id, id);
  await db.brainstorm.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
});
