import { NextResponse } from "next/server";
import { ApiError, handler, parseBody, rateLimit } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { DEFAULT_WEIGHTS, registerSchema } from "@/lib/validation";

export const POST = handler(async (req) => {
  await rateLimit(`register:${req.headers.get("x-forwarded-for") ?? "local"}`, 10, 3600);
  const { email, password, name } = await parseBody(req, registerSchema);
  if (await db.user.findUnique({ where: { email } })) throw new ApiError(409, "Cet e-mail est déjà utilisé");
  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password), preferences: { weights: DEFAULT_WEIGHTS } },
    select: { id: true, email: true, name: true },
  });
  await createSession(user.id);
  return NextResponse.json({ user }, { status: 201 });
});
