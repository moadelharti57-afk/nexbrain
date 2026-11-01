import "server-only";
import { notFound } from "@/lib/api";
import { db } from "@/lib/db";

/** Contrôle de propriété : renvoie 404 (pas 403) pour ne pas révéler l'existence de la ressource. */
export async function ownBrainstorm(userId: string, id: string) {
  const b = await db.brainstorm.findFirst({ where: { id, userId } });
  if (!b) throw notFound("Brainstorm");
  return b;
}

export async function ownRun(userId: string, id: string) {
  const r = await db.run.findFirst({ where: { id, brainstorm: { userId } } });
  if (!r) throw notFound("Exécution");
  return r;
}

export async function ownIdea(userId: string, id: string) {
  const i = await db.idea.findFirst({ where: { id, problem: { brainstorm: { userId } } } });
  if (!i) throw notFound("Idée");
  return i;
}
