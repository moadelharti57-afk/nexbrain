import { NextResponse } from "next/server";
import { ApiError, handler, parseBody, rateLimit } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

export const POST = handler(async (req) => {
  const { email, password } = await parseBody(req, loginSchema);
  await rateLimit(`login:${email}`, 10, 900);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    throw new ApiError(401, "E-mail ou mot de passe incorrect");
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
});
