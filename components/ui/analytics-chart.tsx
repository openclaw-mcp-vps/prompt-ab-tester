"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ChartDatum = {
  variant: string;
  runs: number;
  avgScore: number;
  avgLatencyMs: number;
};

type AnalyticsChartProps = {
  data: ChartDatum[];
};

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-sm text-zinc-400">
        No run data yet. Execute at least one test input to visualize performance.
      </div>
    );
  }

  return (
    <div className="h-[340px] w-full rounded-2xl border border-zinc-800 bg-zinc-900/45 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="variant" stroke="#a1a1aa" />
          <YAxis yAxisId="score" stroke="#a1a1aa" domain={[0, 100]} />
          <YAxis yAxisId="latency" orientation="right" stroke="#a1a1aa" />
          <Tooltip
            cursor={{ fill: "rgba(39, 39, 42, 0.45)" }}
            contentStyle={{
              backgroundColor: "#09090b",
              border: "1px solid #3f3f46",
              borderRadius: "0.65rem",
            }}
          />
          <Legend />
          <Bar yAxisId="score" dataKey="avgScore" name="Avg Score" fill="#38bdf8" radius={[6, 6, 0, 0]} />
          <Bar yAxisId="latency" dataKey="avgLatencyMs" name="Avg Latency (ms)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          <Bar yAxisId="score" dataKey="runs" name="Runs" fill="#22c55e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
