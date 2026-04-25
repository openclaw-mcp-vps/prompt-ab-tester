import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "@/app/globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Prompt AB Tester | A/B test prompts with usage analytics",
  description:
    "Run prompt experiments with live scoring, latency tracking, and clear winner selection so AI teams can ship better prompts faster.",
  metadataBase: new URL("https://prompt-ab-tester.app"),
  openGraph: {
    title: "Prompt AB Tester",
    description:
      "Create prompt variants, route traffic, and measure quality and latency in one focused A/B testing workspace.",
    type: "website",
    url: "https://prompt-ab-tester.app",
    siteName: "Prompt AB Tester",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt AB Tester",
    description:
      "A/B test prompts with score and latency analytics. Built for AI product teams and prompt consultants.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${headingFont.variable} ${bodyFont.variable} bg-[#0d1117] font-[var(--font-body)] text-zinc-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
