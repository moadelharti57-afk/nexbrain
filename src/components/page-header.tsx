export function PageHeader({ eyebrow, title, hint, actions }: { eyebrow?: string; title: string; hint?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-bold">{title}</h1>
        {hint && <p className="text-sm text-neutral-500">{hint}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return <p className="text-sm text-neutral-500">{label}</p>;
}
