"use client";

import { BarChart3, Brain, History, Home, Lightbulb, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Vue générale", icon: Home },
  { href: "/brainstorms/new", label: "Brainstorming", icon: Brain },
  { href: "/history", label: "Historique", icon: History },
  { href: "/ideas", label: "Mes idées", icon: Lightbulb },
  { href: "/compare", label: "Comparateur", icon: BarChart3 },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function AppNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== "/dashboard" && href !== "/brainstorms/new" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
              active
                ? "bg-violet-100 font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
