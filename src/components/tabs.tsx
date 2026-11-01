"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Tab = { id: string; label: string; content: React.ReactNode };

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div className="space-y-5">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm",
              active === t.id ? "border-violet-600 font-medium text-violet-700 dark:text-violet-300" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
