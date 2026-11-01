import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "@/components/print-button";
import { pageUser } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { CRITERIA_LABEL, EVIDENCE_KIND, IDEA_STATUS, range } from "@/lib/labels";
import { rankedIdeas, type Snapshot } from "@/lib/report";

async function Report({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await pageUser(`/report/${id}`);
  const v = Number(sp.v);
  const snap = await db.brainstormVersion.findFirst({
    where: { brainstormId: id, brainstorm: { userId: user.id }, ...(Number.isInteger(v) && v > 0 && { version: v }) },
    orderBy: { version: "desc" },
  });
  if (!snap) notFound();
  const s = snap.snapshot as unknown as Snapshot;
  const ideas = rankedIdeas(s);
  const top = ideas.filter((i) => i.score && !i.score.blocked).slice(0, 3);
  const decision = s.extra?.decision;
  const ctx = [
    [s.city, s.country].filter(Boolean).join(", "),
    s.sector,
    s.budgetMaxMad != null && `Budget ${s.budgetMaxMad.toLocaleString("fr-FR")} DH`,
    s.deadlineDays != null && `Délai ${s.deadlineDays} jours`,
    s.teamSize && `Équipe ${s.teamSize}`,
  ].filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl space-y-8 bg-white px-6 py-10 text-neutral-900 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link href={`/brainstorms/${id}`} className="text-sm text-neutral-500 hover:underline">← Retour</Link>
        <PrintButton auto={sp.print === "1"} />
      </div>

      <header className="space-y-1 border-b border-neutral-200 pb-4">
        <p className="text-xs font-semibold tracking-widest text-violet-700">NEXBRAIN · RAPPORT</p>
        <h1 className="text-3xl font-bold">{s.title}</h1>
        <p className="text-sm text-neutral-600">{ctx.join(" · ")}</p>
        <p className="text-xs text-neutral-500">Version {snap.version} · {snap.createdAt.toLocaleDateString("fr-FR")}</p>
      </header>

      {decision && (
        <section className="space-y-2 break-inside-avoid">
          <h2 className="text-lg font-semibold">Décision</h2>
          <p className="text-sm">{decision.summary}</p>
          {decision.insufficientEvidence && <p className="text-sm font-medium text-amber-700">Aucune idée n&apos;est suffisamment documentée : valider le besoin sur le terrain avant d&apos;investir.</p>}
        </section>
      )}

      <section className="space-y-2 break-inside-avoid">
        <h2 className="text-lg font-semibold">Classement</h2>
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-300 text-left text-xs text-neutral-500">
            <tr><th className="py-1">Rang</th><th>Idée</th><th className="text-right">Score</th><th className="text-right">Coût</th><th className="text-right">Délai</th><th className="text-right">Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {ideas.map((i) => (
              <tr key={i.id}>
                <td className="py-1">{i.score?.rank ?? "—"}</td>
                <td className="font-medium">{i.name}</td>
                <td className="text-right tabular-nums">{i.score ? `${i.score.total}/100` : "—"}</td>
                <td className="text-right">{i.techEstimate ? range(i.techEstimate.costMinMad, i.techEstimate.costMaxMad, "DH") : "—"}</td>
                <td className="text-right">{i.techEstimate ? range(i.techEstimate.durationMinDays, i.techEstimate.durationMaxDays, "j") : "—"}</td>
                <td className="text-right text-xs">{IDEA_STATUS[i.status].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-neutral-500">Un score n&apos;est pas une probabilité de réussite. Le classement dépend des pondérations choisies.</p>
      </section>

      {top.map((i) => (
        <section key={i.id} className="space-y-3 break-before-page border-t border-neutral-200 pt-6 print:border-0 print:pt-0">
          <h2 className="text-xl font-semibold">#{i.score?.rank} {i.name}</h2>
          <p className="text-sm text-neutral-700">{i.pitch}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {i.aiValue && <><dt className="text-neutral-500">Valeur de l&apos;IA</dt><dd>{i.aiValue}</dd></>}
            {i.businessModel && <><dt className="text-neutral-500">Modèle économique</dt><dd>{i.businessModel}</dd></>}
            {i.techEstimate && <><dt className="text-neutral-500">Coût (min / central / max)</dt><dd>{i.techEstimate.costMinMad} / {i.techEstimate.costCentralMad} / {i.techEstimate.costMaxMad} DH</dd></>}
            {i.techEstimate && <><dt className="text-neutral-500">Faisabilité</dt><dd>{i.techEstimate.feasibility} %</dd></>}
          </dl>
          {i.score && (
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {(Object.keys(CRITERIA_LABEL) as (keyof typeof CRITERIA_LABEL)[]).map((k) => (
                <div key={k} className="rounded border border-neutral-200 p-2">
                  <p className="text-lg font-semibold tabular-nums">{i.score![k]}</p>
                  <p className="text-neutral-500">{CRITERIA_LABEL[k]}</p>
                </div>
              ))}
            </div>
          )}
          {i.score?.rationale && <p className="text-sm whitespace-pre-line">{i.score.rationale}</p>}
          {i.mvpFeatures?.length ? <p className="text-sm"><span className="text-neutral-500">MVP : </span>{i.mvpFeatures.join(" · ")}</p> : null}
          {i.marketAnalysis && (
            <div className="text-sm">
              <p className="font-medium">Marché{!i.marketAnalysis.verified && <span className="font-normal text-amber-700"> — analyse non vérifiée</span>}</p>
              <ul className="list-disc pl-5">
                {i.marketAnalysis.fieldQuestions.map((q) => <li key={q}>À valider : {q}</li>)}
                {i.marketAnalysis.adoptionRisks.map((q) => <li key={q}>Risque : {q}</li>)}
              </ul>
            </div>
          )}
          {i.evidence?.length ? (
            <ul className="space-y-1 text-sm">
              {i.evidence.map((e, n) => (
                <li key={n}><span className="text-xs font-medium text-neutral-500">[{EVIDENCE_KIND[e.kind].label}]</span> {e.statement}{e.sourceUrl && <span className="text-xs text-violet-700"> — {e.sourceUrl}</span>}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <section className="space-y-2 break-before-page">
        <h2 className="text-lg font-semibold">Problèmes identifiés</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {s.problems.map((p) => <li key={p.id} className={p.selected ? "font-medium" : ""}>{p.title}</li>)}
        </ul>
      </section>

      <footer className="border-t border-neutral-200 pt-3 text-xs text-neutral-500">
        Rapport généré par NexBrain. Les estimations sont des fourchettes fondées sur des hypothèses explicites ; elles doivent être validées sur le terrain.
      </footer>
    </article>
  );
}

export default function ReportPage(props: PageProps<"/report/[id]">) {
  return (
    <div className="flex-1 bg-white print:bg-white">
      <Suspense fallback={<p className="p-10 text-sm text-neutral-500">Chargement…</p>}>
        <Report params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
