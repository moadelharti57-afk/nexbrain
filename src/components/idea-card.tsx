import Link from "next/link";
import { FavoriteButton } from "@/components/brainstorm/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IDEA_STATUS, range } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type IdeaCardData = {
  id: string;
  name: string;
  pitch: string;
  status: keyof typeof IDEA_STATUS;
  favorite: boolean;
  score: { total: number; rank: number | null; blocked: boolean; blockReasons: string[] } | null;
  techEstimate: { costMinMad: number; costMaxMad: number; durationMinDays: number; durationMaxDays: number } | null;
  marketAnalysis: { verified: boolean } | null;
};

/** Carte idée : score, coût, délai, preuve et statut de sélection (diapositive 16). */
export function IdeaCard({ idea, highlight }: { idea: IdeaCardData; highlight?: boolean }) {
  const s = IDEA_STATUS[idea.status];
  const t = idea.techEstimate;
  return (
    <Link href={`/ideas/${idea.id}`} className="block">
      <Card className={cn("h-full space-y-3 transition-colors hover:border-violet-400", highlight && "border-violet-300 dark:border-violet-800")}>
        <div className="flex items-start justify-between gap-2">
          <Badge tone={s.tone}>{s.label}</Badge>
          <FavoriteButton ideaId={idea.id} favorite={idea.favorite} />
        </div>
        <div>
          <p className="text-lg font-semibold">
            {idea.score?.rank && <span className="mr-1 text-violet-600">#{idea.score.rank}</span>}
            {idea.name}
          </p>
          <p className="line-clamp-2 text-sm text-neutral-500">{idea.pitch}</p>
        </div>
        {idea.score && (
          <p className="text-3xl font-bold tabular-nums">
            {idea.score.total}
            <span className="text-base font-normal text-neutral-400">/100</span>
          </p>
        )}
        {t && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-neutral-500">Coût</dt><dd className="font-medium">{range(t.costMinMad, t.costMaxMad, "DH")}</dd></div>
            <div><dt className="text-neutral-500">Délai</dt><dd className="font-medium">{range(t.durationMinDays, t.durationMaxDays, "j")}</dd></div>
          </dl>
        )}
        {idea.score?.blocked && <p className="text-xs text-red-600">{idea.score.blockReasons.join(" ; ")}</p>}
        {idea.marketAnalysis && !idea.marketAnalysis.verified && <p className="text-xs text-amber-600">Marché : analyse non vérifiée</p>}
      </Card>
    </Link>
  );
}

