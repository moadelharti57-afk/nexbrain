import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { ownBrainstorm } from "@/lib/access";
import { handler, requireUser } from "@/lib/api";
import { db } from "@/lib/db";

/** Duplique le contexte d'un brainstorm (sans les résultats) en nouveau brouillon. */
export const POST = handler(async (_req, ctx: RouteContext<"/api/brainstorms/[id]/duplicate">) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const src = await ownBrainstorm(user.id, id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, createdAt, updatedAt, status, version, extra, weights, ...ctxFields } = src;
  const extraRest = { ...((extra as Record<string, unknown> | null) ?? {}) };
  delete extraRest.decision; // la décision appartient à l'analyse d'origine
  const copy = await db.brainstorm.create({
    data: {
      ...ctxFields,
      title: `${src.title} (copie)`,
      extra: extraRest as Prisma.InputJsonValue,
      weights: (weights ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return NextResponse.json({ brainstorm: copy }, { status: 201 });
});
