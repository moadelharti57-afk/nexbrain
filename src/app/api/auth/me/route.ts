import { NextResponse } from "next/server";
import { handler, requireUser } from "@/lib/api";

export const GET = handler(async () => NextResponse.json({ user: await requireUser() }));
