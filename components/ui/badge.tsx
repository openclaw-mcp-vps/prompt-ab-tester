import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "success" | "warning";
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "default" && "border-zinc-700 text-zinc-300",
        tone === "success" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        tone === "warning" && "border-amber-500/40 bg-amber-500/10 text-amber-300",
        className,
      )}
      {...props}
    />
  );
}
