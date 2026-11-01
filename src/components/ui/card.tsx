import { cn } from "@/lib/utils";

export function Card({ className, ...p }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950", className)} {...p} />;
}
export function CardTitle({ className, ...p }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-semibold", className)} {...p} />;
}
export function CardHint({ className, ...p }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-neutral-500", className)} {...p} />;
}
