import Link from "next/link";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/dashboard-actions";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="border-b border-neutral-200 p-4 md:w-60 md:shrink-0 md:border-r md:border-b-0 dark:border-neutral-800">
        <div className="flex items-center justify-between md:mb-6 md:block">
          <Link href="/dashboard" className="text-lg font-bold">
            Nex<span className="text-violet-600">Brain</span>
          </Link>
          <div className="md:hidden"><LogoutButton /></div>
        </div>
        <div className="mt-3 md:mt-0">
          {/* usePathname est une donnée de requête : isolée dans Suspense */}
          <Suspense fallback={<div className="h-9 md:h-72" />}><AppNav /></Suspense>
        </div>
        <div className="mt-6 hidden px-3 md:block"><LogoutButton /></div>
      </aside>
      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 space-y-8 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
