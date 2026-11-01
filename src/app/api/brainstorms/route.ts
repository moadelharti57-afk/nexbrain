import { NextResponse } from "next/server";
import { handler, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { brainstormInputSchema } from "@/lib/validation";

export const GET = handler(async (req) => {
  const user = await requireUser();
  const status = new URL(req.url).searchParams.get("status");
  const brainstorms = await db.brainstorm.findMany({
    where: {
      userId: user.id,
      ...(status ? { status: status as never } : { status: { not: "ARCHIVED" } }),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, title: true, sector: true, city: true, status: true, mode: true, version: true,
      createdAt: true, updatedAt: true, _count: { select: { problems: true } },
    },
  });
  return NextResponse.json({ brainstorms });
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, brainstormInputSchema);
  const brainstorm = await db.brainstorm.create({ data: { ...input, userId: user.id } });
  return NextResponse.json({ brainstorm }, { status: 201 });
});
