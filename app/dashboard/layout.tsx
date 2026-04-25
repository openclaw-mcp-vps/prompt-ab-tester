import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { PAYWALL_COOKIE_NAME, verifyAccessToken } from "@/lib/paywall";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/tests", label: "Tests" },
  { href: "/dashboard/analytics", label: "Analytics" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(PAYWALL_COOKIE_NAME)?.value;
  const access = verifyAccessToken(accessToken);

  if (!access) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-8">
          <div>
            <p className="font-[var(--font-heading)] text-lg font-semibold text-zinc-100">Prompt AB Tester</p>
            <p className="text-xs text-zinc-400">Signed in as {access.email}</p>
          </div>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="/"
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              Home
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-8">{children}</div>
    </div>
  );
}
