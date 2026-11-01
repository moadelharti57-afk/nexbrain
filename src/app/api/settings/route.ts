import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { handler, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { weightsSchema } from "@/lib/validation";

const settingsSchema = z.object({
  name: z.string().trim().max(100).optional(),
  weights: weightsSchema.optional(),
});

/** Préférences utilisateur : nom affiché et pondérations de scoring par défaut. */
export const PATCH = handler(async (req) => {
  const user = await requireUser();
  const { name, weights } = await parseBody(req, settingsSchema);
  const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { preferences: true } });
  const preferences = { ...((current.preferences as object) ?? {}), ...(weights && { weights }) };
  const updated = await db.user.update({
    where: { id: user.id },
    data: { ...(name !== undefined && { name: name || null }), preferences: preferences as Prisma.InputJsonValue },
    select: { id: true, name: true, preferences: true },
  });
  return NextResponse.json({ user: updated });
});
