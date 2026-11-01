import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-2 focus:outline-violet-600 dark:border-neutral-700";

export function Input({ className, ...p }: React.ComponentProps<"input">) {
  return <input className={cn(control, className)} {...p} />;
}
export function Textarea({ className, ...p }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24", className)} {...p} />;
}
export function Select({ className, ...p }: React.ComponentProps<"select">) {
  return <select className={cn(control, "dark:bg-neutral-950", className)} {...p} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}
