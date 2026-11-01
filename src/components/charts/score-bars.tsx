"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CRITERIA_LABEL, CRITERIA_SHORT } from "@/lib/labels";

const COLORS = ["#7c3aed", "#0891b2", "#ea580c", "#16a34a", "#db2777"];

/** Notes par critère, groupées par idée. */
export function ScoreBars({ series }: { series: { name: string; criteria: Record<keyof typeof CRITERIA_LABEL, number> }[] }) {
  const data = (Object.keys(CRITERIA_LABEL) as (keyof typeof CRITERIA_LABEL)[]).map((k) => ({
    criterion: CRITERIA_SHORT[k],
    ...Object.fromEntries(series.map((s) => [s.name, s.criteria[k]])),
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis dataKey="criterion" tick={{ fontSize: 11, fill: "currentColor" }} interval={0} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "currentColor" }} width={32} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
