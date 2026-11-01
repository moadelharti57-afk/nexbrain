import { describe, expect, it } from "vitest";
import { checkConstraints, costScore, delayScore, rank, weightedScore } from "@/lib/scoring";
import { DEFAULT_WEIGHTS } from "@/lib/validation";

describe("weightedScore", () => {
  it("applique Σ(note × poids) / Σ(poids)", () => {
    const s = { feasibility: 100, cost: 0, delay: 0, demand: 0, commercial: 0 };
    expect(weightedScore(s, DEFAULT_WEIGHTS)).toBe(30);
  });
  it("renvoie 0 si tous les poids sont nuls", () => {
    const w = { feasibility: 0, cost: 0, delay: 0, demand: 0, commercial: 0 };
    expect(weightedScore({ feasibility: 90, cost: 90, delay: 90, demand: 90, commercial: 90 }, w)).toBe(0);
  });
  it("borne les notes entre 0 et 100", () => {
    const s = { feasibility: 150, cost: 150, delay: 150, demand: 150, commercial: 150 };
    expect(weightedScore(s, DEFAULT_WEIGHTS)).toBe(100);
  });
});

describe("costScore / delayScore", () => {
  it("note neutre sans contrainte", () => {
    expect(costScore(500, null)).toBe(50);
    expect(delayScore(5, null)).toBe(50);
  });
  it("100 → 50 → 0 selon le ratio estimé / disponible", () => {
    expect(costScore(0, 1000)).toBe(100);
    expect(costScore(250, 1000)).toBe(88);
    expect(costScore(1000, 1000)).toBe(50);
    expect(costScore(1500, 1000)).toBe(0);
    expect(delayScore(8, 7)).toBe(36);
  });
});

describe("checkConstraints", () => {
  it("bloque si le coût minimal dépasse le budget", () => {
    const r = checkConstraints({ costMinMad: 1200, costMaxMad: 2000, durationMinDays: 3, durationMaxDays: 5 }, { budgetMaxMad: 1000, deadlineDays: 7 });
    expect(r.blocked).toBe(true);
    expect(r.reasons).toHaveLength(1);
  });
  it("accepte une idée dans les contraintes", () => {
    const r = checkConstraints({ costMinMad: 300, costMaxMad: 800, durationMinDays: 3, durationMaxDays: 6 }, { budgetMaxMad: 1000, deadlineDays: 7 });
    expect(r.blocked).toBe(false);
  });
});

describe("rank", () => {
  it("classe par score et exclut les idées bloquées", () => {
    const r = rank([
      { id: "a", total: 70, blocked: false },
      { id: "b", total: 90, blocked: true },
      { id: "c", total: 80, blocked: false },
    ]);
    expect(r.find((x) => x.id === "c")!.rank).toBe(1);
    expect(r.find((x) => x.id === "a")!.rank).toBe(2);
    expect(r.find((x) => x.id === "b")!.rank).toBeNull();
  });
});

import { registerSchema } from "@/lib/validation";

describe("registerSchema", () => {
  it("accepte un nom vide (champ facultatif)", () => {
    const r = registerSchema.safeParse({ email: "A@B.ma", password: "motdepasse1", name: "" });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ email: "a@b.ma", password: "motdepasse1", name: undefined });
  });
});
