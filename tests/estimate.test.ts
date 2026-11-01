import { describe, expect, it } from "vitest";
import { criticalPathHours, estimate } from "@/lib/estimate";

const tasks = [
  { title: "A", hoursMin: 4, hoursMax: 8, dependsOn: [] },
  { title: "B", hoursMin: 6, hoursMax: 10, dependsOn: ["A"] },
  { title: "C", hoursMin: 8, hoursMax: 12, dependsOn: ["A"] },
  { title: "D", hoursMin: 2, hoursMax: 4, dependsOn: ["B", "C"] },
];

describe("criticalPathHours", () => {
  it("suit la plus longue chaîne de dépendances", () => {
    expect(criticalPathHours(tasks, (t) => t.hoursMin)).toBe(4 + 8 + 2);
  });
  it("ne boucle pas sur un cycle", () => {
    const cyc = [
      { title: "X", hoursMin: 1, hoursMax: 1, dependsOn: ["Y"] },
      { title: "Y", hoursMin: 1, hoursMax: 1, dependsOn: ["X"] },
    ];
    expect(() => criticalPathHours(cyc, (t) => t.hoursMin)).not.toThrow();
  });
});

describe("estimate", () => {
  it("durée calendaire ≥ chemin critique même avec une grande équipe", () => {
    const e = estimate(tasks, [], { hourlyRateMad: 0, teamSize: 10, hoursPerDay: 7, contingency: 0 });
    // chemin critique min = 14 h → 2 jours, alors que 20 h / 10 personnes = 2 h
    expect(e.durationMinDays).toBe(2);
  });
  it("calcule min ≤ central ≤ max, avec marge sur le max", () => {
    const e = estimate(tasks, [{ label: "API", unit: "mois", qty: 2, unitPriceMad: 100 }], {
      hourlyRateMad: 10, teamSize: 2, hoursPerDay: 6, contingency: 0.1,
    });
    expect(e.costMinMad).toBe(200 + 20 * 10);
    expect(e.costMaxMad).toBe(Math.round((200 + 34 * 10) * 1.1));
    expect(e.costMinMad).toBeLessThanOrEqual(e.costCentralMad);
    expect(e.costCentralMad).toBeLessThanOrEqual(e.costMaxMad);
  });
});

import { schedule } from "@/lib/estimate";

describe("schedule", () => {
  it("démarre une tâche après ses dépendances", () => {
    const s = schedule(tasks, 6, (t) => t.hoursMin);
    const get = (n: string) => s.find((t) => t.title === n)!;
    expect(get("A").startDay).toBe(0);
    expect(get("B").startDay).toBeCloseTo(4 / 6);
    expect(get("D").startDay).toBeCloseTo((4 + 8) / 6);
  });
});
