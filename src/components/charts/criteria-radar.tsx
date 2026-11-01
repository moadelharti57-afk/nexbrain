"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CRITERIA_LABEL, CRITERIA_SHORT } from "@/lib/labels";

type Criteria = Record<keyof typeof CRITERIA_LABEL, number>;
const COLORS = ["#7c3aed", "#0891b2", "#ea580c", "#16a34a", "#db2777"];

/** Radar des 5 critères, pour une ou plusieurs idées. */
export function CriteriaRadar({ series }: { series: { name: string; criteria: Criteria }[] }) {
  const data = (Object.keys(CRITERIA_LABEL) as (keyof Criteria)[]).map((k) => ({
    criterion: CRITERIA_SHORT[k],
    ...Object.fromEntries(series.map((s) => [s.name, s.criteria[k]])),
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="currentColor" strokeOpacity={0.15} />
          <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: "currentColor" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {series.map((s, i) => (
            <Radar key={s.name} name={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
          ))}
          <Tooltip contentStyle={{ fontSize: 12 }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
