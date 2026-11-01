import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_WEIGHTS, weightsSchema, type Weights } from "@/lib/validation";

/** Pondérations par défaut de l'utilisateur (ou celles du cahier des charges). */
export async function userDefaultWeights(userId: string): Promise<Weights> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  const prefs = u?.preferences as { weights?: unknown } | null;
  return weightsSchema.safeParse(prefs?.weights).data ?? DEFAULT_WEIGHTS;
}
