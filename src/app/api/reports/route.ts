import { NextResponse } from "next/server";
import { ownBrainstorm } from "@/lib/access";
import { ApiError, handler, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { toMarkdown, type Snapshot } from "@/lib/report";
import { reportSchema } from "@/lib/validation";

export const GET = handler(async (req) => {
  const user = await requireUser();
  const brainstormId = new URL(req.url).searchParams.get("brainstormId") ?? undefined;
  const reports = await db.report.findMany({
    where: { brainstorm: { userId: user.id }, brainstormId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reports });
});

/**
 * Export d'une version figée.
 * - JSON : instantané complet
 * - MARKDOWN : rapport lisible
 * - PDF : renvoie l'URL de la page de rapport imprimable (« Enregistrer en PDF » du navigateur,
 *   qui gère tous les caractères, contrairement aux polices standard des générateurs PDF serveur)
 */
export const POST = handler(async (req) => {
  const user = await requireUser();
  const { brainstormId, format, version } = await parseBody(req, reportSchema);
  await ownBrainstorm(user.id, brainstormId);
  const snap = await db.brainstormVersion.findFirst({
    where: { brainstormId, ...(version != null && { version }) },
    orderBy: { version: "desc" },
  });
  if (!snap) throw new ApiError(422, "Aucune analyse terminée à exporter");
  const location = format === "PDF" ? `/report/${brainstormId}?v=${snap.version}&print=1` : null;
  await db.report.create({ data: { brainstormId, version: snap.version, format, location } });

  if (format === "PDF") return NextResponse.json({ url: location });
  const base = `nexbrain-${brainstormId}-v${snap.version}`;
  if (format === "MARKDOWN") {
    return new NextResponse(toMarkdown(snap.snapshot as unknown as Snapshot, snap.version, snap.createdAt), {
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.md"` },
    });
  }
  return new NextResponse(JSON.stringify(snap.snapshot, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${base}.json"` },
  });
});
