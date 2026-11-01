"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Postes de coût (barres horizontales) avec la ligne du budget. */
export function CostLinesChart({ lines }: { lines: { label: string; total: number }[] }) {
  return (
    <div className="w-full" style={{ height: Math.max(160, lines.length * 44) }}>
      <ResponsiveContainer>
        <BarChart data={lines} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid horizontal={false} strokeOpacity={0.15} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} unit=" DH" />
          <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12, fill: "currentColor" }} />
          <Tooltip formatter={(v) => `${Number(v).toLocaleString("fr-FR")} DH`} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="total" fill="#7c3aed" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Scénarios min / central / max comparés au budget. */
export function ScenarioChart({ min, central, max, budget }: { min: number; central: number; max: number; budget?: number | null }) {
  const data = [
    { name: "Min", value: min },
    { name: "Central", value: central },
    { name: "Max", value: max },
  ];
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 16 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "currentColor" }} />
          <YAxis tick={{ fontSize: 11, fill: "currentColor" }} width={48} />
          <Tooltip formatter={(v) => `${Number(v).toLocaleString("fr-FR")} DH`} contentStyle={{ fontSize: 12 }} />
          {budget != null && <ReferenceLine y={budget} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "Budget", fontSize: 11, fill: "#dc2626", position: "insideTopRight" }} />}
          <Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
