import type { ScheduledTask } from "@/lib/estimate";

/** Planning au plus tôt des tâches (diagramme de Gantt simple, sans dépendance JS). */
export function Gantt({ tasks, deadlineDays }: { tasks: ScheduledTask[]; deadlineDays?: number | null }) {
  const span = Math.max(1, Math.ceil(Math.max(...tasks.map((t) => t.endDay), deadlineDays ?? 0)));
  const days = Array.from({ length: span }, (_, i) => i + 1);
  const pct = (d: number) => `${(d / span) * 100}%`;
  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-[minmax(100px,180px)_1fr] gap-3 text-xs text-neutral-500">
        <span />
        <div className="flex">{days.map((d) => <span key={d} className="flex-1 text-center">J{d}</span>)}</div>
      </div>
      {tasks.map((t) => (
        <div key={t.title} className="grid grid-cols-[minmax(100px,180px)_1fr] items-center gap-3">
          <span className="truncate" title={t.title}>{t.title}</span>
          <div className="relative h-6 rounded bg-neutral-100 dark:bg-neutral-900">
            <div
              className="absolute inset-y-0 rounded bg-violet-500"
              style={{ left: pct(t.startDay), width: `max(4px, ${pct(t.endDay - t.startDay)})` }}
              title={`${t.hoursMin}–${t.hoursMax} h${t.dependsOn.length ? ` · après : ${t.dependsOn.join(", ")}` : ""}`}
            />
            {deadlineDays != null && deadlineDays <= span && (
              <div className="absolute inset-y-[-4px] w-px bg-red-500" style={{ left: pct(deadlineDays) }} />
            )}
          </div>
        </div>
      ))}
      {deadlineDays != null && <p className="text-xs text-neutral-500"><span className="text-red-500">│</span> délai disponible ({deadlineDays} j)</p>}
    </div>
  );
}
