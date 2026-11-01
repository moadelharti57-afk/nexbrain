import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
      success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      info: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...p }: React.ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...p} />;
}
