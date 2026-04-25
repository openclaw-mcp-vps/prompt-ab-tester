import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-sky-500 text-[#0d1117] hover:bg-sky-400",
        variant === "secondary" && "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        variant === "ghost" && "bg-transparent text-zinc-200 hover:bg-zinc-800",
        className,
      )}
      {...props}
    />
  );
}
