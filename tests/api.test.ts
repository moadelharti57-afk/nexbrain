/**
 * Tests d'intégration de l'API, contre un serveur lancé avec AI_MOCK=true + worker :
 *   NEXBRAIN_TEST_URL=http://localhost:3000 npm test
 * Ignorés si NEXBRAIN_TEST_URL n'est pas défini.
 */
import { beforeAll, describe, expect, it } from "vitest";

const BASE = process.env.NEXBRAIN_TEST_URL;

class Client {
  cookie = "";
  async req(path: string, init: { method?: string; body?: unknown } = {}) {
    const res = await fetch(BASE + path, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", cookie: this.cookie },
      body: init.body ? JSON.stringify(init.body) : undefined,
      redirect: "manual",
    });
    const set = res.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const type = res.headers.get("content-type") ?? "";
    const data = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  }
  async register() {
    const email = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.ma`;
    const r = await this.req("/api/auth/register", { body: { email, password: "motdepasse1", name: "" } });
    expect(r.status).toBe(201);
    return email;
  }
}

async function waitRun(c: Client, runId: string, timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const r = await c.req(`/api/runs/${runId}`);
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(r.data.run.status)) return r.data;
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error("Run trop long");
}

describe.skipIf(!BASE)("API NexBrain", () => {
  const alice = new Client();
  const bob = new Client();
  let brainstormId = "";
  let ideaIds: string[] = [];

  beforeAll(async () => {
    await alice.register();
    await bob.register();
  });

  it("refuse les requêtes non authentifiées", async () => {
    expect((await new Client().req("/api/brainstorms")).status).toBe(401);
  });

  it("valide les entrées avec Zod", async () => {
    const r = await alice.req("/api/brainstorms", { body: { title: "" } });
    expect(r.status).toBe(422);
    expect(r.data.details.fieldErrors.title).toBeDefined();
  });

  it("exécute les 5 agents et classe les idées", async () => {
    const b = await alice.req("/api/brainstorms", { body: { title: "Test API", city: "Béni Mellal", budgetMaxMad: 1000, deadlineDays: 7, teamSize: 4 } });
    expect(b.status).toBe(201);
    brainstormId = b.data.brainstorm.id;

    const run = await alice.req(`/api/brainstorms/${brainstormId}/run`, { body: {} });
    expect(run.status).toBe(202);
    expect((await alice.req(`/api/brainstorms/${brainstormId}/run`, { body: {} })).status).toBe(409);

    const done = await waitRun(alice, run.data.run.id);
    expect(done.run.status).toBe("SUCCEEDED");
    expect(done.progress).toBe(100);

    const full = await alice.req(`/api/brainstorms/${brainstormId}`);
    const ideas = full.data.brainstorm.problems.flatMap((p: { ideas: unknown[] }) => p.ideas);
    expect(ideas.length).toBeGreaterThan(0);
    ideaIds = ideas.map((i: { id: string }) => i.id);
    const ranks = ideas.map((i: { score: { rank: number | null } }) => i.score.rank).filter(Boolean).sort();
    expect(ranks[0]).toBe(1);
  });

  it("isole les données entre utilisateurs (404)", async () => {
    expect((await bob.req(`/api/brainstorms/${brainstormId}`)).status).toBe(404);
    expect((await bob.req(`/api/ideas/${ideaIds[0]}`)).status).toBe(404);
    expect((await bob.req(`/api/brainstorms/${brainstormId}`, { method: "DELETE" })).status).toBe(404);
    expect((await bob.req("/api/comparisons", { body: { ideaIds: ideaIds.slice(0, 2) } })).status).toBe(404);
  });

  it("compare avec des pondérations personnalisées", async () => {
    const r = await alice.req("/api/comparisons", {
      body: { ideaIds: ideaIds.slice(0, 2), weights: { feasibility: 100, cost: 0, delay: 0, demand: 0, commercial: 0 } },
    });
    expect(r.status).toBe(201);
    for (const row of r.data.comparison.result) expect(row.total).toBe(row.criteria.feasibility);
  });

  it("exporte en JSON, Markdown et PDF", async () => {
    const json = await alice.req("/api/reports", { body: { brainstormId, format: "JSON" } });
    expect(json.status).toBe(200);
    expect(json.data.id).toBe(brainstormId);
    const md = await alice.req("/api/reports", { body: { brainstormId, format: "MARKDOWN" } });
    expect(md.headers.get("content-type")).toContain("text/markdown");
    expect(md.data).toContain("# NexBrain — Test API");
    const pdf = await alice.req("/api/reports", { body: { brainstormId, format: "PDF" } });
    expect(pdf.data.url).toMatch(new RegExp(`^/report/${brainstormId}\\?v=\\d+&print=1$`));
  });

  it("relance depuis le Décideur et crée une nouvelle version", async () => {
    const run = await alice.req(`/api/brainstorms/${brainstormId}/run`, { body: { startFrom: "DECIDER" } });
    expect((await waitRun(alice, run.data.run.id)).run.status).toBe("SUCCEEDED");
    const full = await alice.req(`/api/brainstorms/${brainstormId}`);
    expect(full.data.brainstorm.versions.length).toBe(2);
  });

  it("duplique le contexte sans les résultats", async () => {
    const r = await alice.req(`/api/brainstorms/${brainstormId}/duplicate`, { body: {} });
    expect(r.status).toBe(201);
    expect(r.data.brainstorm.status).toBe("DRAFT");
    expect(r.data.brainstorm.budgetMaxMad).toBe(1000);
    expect(r.data.brainstorm.extra?.decision).toBeUndefined();
  });

  it("enregistre les pondérations par défaut", async () => {
    const weights = { feasibility: 10, cost: 10, delay: 10, demand: 10, commercial: 10 };
    const r = await alice.req("/api/settings", { method: "PATCH", body: { weights } });
    expect(r.status).toBe(200);
    expect(r.data.user.preferences.weights).toEqual(weights);
  });

  it("déconnecte", async () => {
    await alice.req("/api/auth/logout", { body: {} });
    expect((await alice.req("/api/auth/me")).status).toBe(401);
  });
});
