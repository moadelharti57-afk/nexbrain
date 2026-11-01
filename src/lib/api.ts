import "server-only";
import { unstable_rethrow } from "next/navigation";
import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { redis } from "@/lib/redis";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, "Authentification requise");
export const notFound = (what = "Ressource") => new ApiError(404, `${what} introuvable`);

/** Exige un utilisateur connecté. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

/** Lit et valide le corps JSON avec Zod. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Corps JSON invalide");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiError(422, "Données invalides", z.flattenError(parsed.error));
  return parsed.data;
}

/** Limitation de débit simple à fenêtre fixe (Redis). */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const k = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const n = await redis.incr(k);
  if (n === 1) await redis.expire(k, windowSec);
  if (n > limit) throw new ApiError(429, "Trop de requêtes, réessayez plus tard");
}

/** Enveloppe un handler : convertit les erreurs en réponses JSON homogènes. */
export function handler<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    // Les routes API sont privées et dépendent de la session : jamais prérendues.
    await connection();
    try {
      return await fn(req, ctx);
    } catch (err) {
      unstable_rethrow(err); // laisse passer les erreurs internes de Next.js
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      console.error(err);
      return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
    }
  };
}
