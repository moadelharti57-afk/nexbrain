#!/usr/bin/env node
/**
 * Faux serveur de l'API Gemini, pour tester le chemin IA réel sans clé ni réseau :
 *   node scripts/fake-gemini.mjs            (port 8787)
 *   GEMINI_BASE_URL=http://localhost:8787 GEMINI_API_KEY=fake AI_MOCK=false npm run worker
 *
 * Il reconnaît l'agent d'après le prompt et renvoie un JSON plausible. Pour éprouver
 * l'orchestrateur, il entoure parfois le JSON de texte et renvoie une sortie invalide
 * au premier appel de l'Innovateur (le client doit relancer avec le message d'erreur).
 * GET /__stats → nombre d'appels par agent ; GET /__last → dernier prompt reçu.
 */
import http from "node:http";

const PORT = Number(process.env.PORT ?? 8787);
const stats = { total: 0, byAgent: {}, retries: 0 };
let last = "";
let innovatorCalls = 0;

const json = (o) => JSON.stringify(o);

function respond(prompt) {
  const isRetry = prompt.includes("Ta réponse précédente");
  if (isRetry) stats.retries++;
  if (prompt.includes("agent Explorateur")) {
    return ["EXPLORER", "Voici les problèmes identifiés :\n```json\n" + json({
      problems: [
        { title: "Les artisans perdent du temps sur les devis", description: "Rédaction manuelle des devis, souvent le soir.", affectedUsers: "Artisans", consequences: "Clients perdus", frequency: 5, evidence: [{ kind: "HYPOTHESIS", statement: "Fréquence supposée", validation: "Interroger 10 artisans" }] },
        { title: "Démarches administratives incomprises", description: "Formulaires en français administratif.", affectedUsers: "Habitants", consequences: "Dossiers rejetés", frequency: 4, evidence: [] },
        { title: "Suivi de stock approximatif", description: "Cahier papier dans les épiceries.", affectedUsers: "Petits commerces", consequences: "Ruptures", frequency: 3, evidence: [] },
      ],
    }) + "\n```\nJ'espère que cela aide."];
  }
  if (prompt.includes("agent Innovateur")) {
    innovatorCalls++;
    const n = new Set([...prompt.matchAll(/^\[(\d+)\]/gm)].map((m) => m[1])).size || 1;
    if (innovatorCalls === 1) return ["INNOVATOR", json({ ideas: [{ problemIndex: 0, name: "X" }] })]; // invalide exprès
    const ideas = [];
    for (let i = 0; i < n; i++) {
      ideas.push(
        { problemIndex: i, name: `Idée ${i + 1}A`, pitch: "Note vocale transformée en document structuré.", aiValue: "Transcription et extraction de champs depuis la voix", businessModel: "Abonnement 49 DH/mois", mvpFeatures: ["Enregistrement", "Extraction", "PDF"] },
        { problemIndex: i, name: `Idée ${i + 1}B`, pitch: "Assistant guidé par questions courtes.", aiValue: "Reformulation et vérification de cohérence", businessModel: "Paiement à l'usage", mvpFeatures: ["Questionnaire", "Génération", "Partage WhatsApp"] },
      );
    }
    return ["INNOVATOR", json({ ideas })];
  }
  if (prompt.includes("agent Analyste")) {
    return ["ANALYST", json({
      competitors: [{ name: "Excel / Word", kind: "alternative" }, { name: "Carnet papier", kind: "alternative" }],
      adoptionRisks: ["Habitude du papier", "Confiance dans l'IA"],
      fieldQuestions: ["Combien de devis par semaine ?", "Prix acceptable ?"],
      demandScore: 55 + Math.floor(Math.random() * 30),
      commercialScore: 40 + Math.floor(Math.random() * 30),
      evidence: [{ kind: "FACT", statement: "Affirmation non sourcée", sourceUrl: "https://example.com" }],
    })];
  }
  if (prompt.includes("agent Technique")) {
    const k = Math.random();
    return ["TECHNICAL", json({
      architecture: "Next.js + API Gemma + PostgreSQL",
      tasks: [
        { title: "Conception", phase: "Fondations", hoursMin: 3, hoursMax: 6, dependsOn: [] },
        { title: "Transcription", phase: "IA", hoursMin: 6 + k * 6, hoursMax: 12 + k * 10, dependsOn: ["Conception"] },
        { title: "Interface", phase: "UI", hoursMin: 6, hoursMax: 12, dependsOn: ["Conception"] },
        { title: "Tests", phase: "Recette", hoursMin: 3, hoursMax: 6, dependsOn: ["Transcription", "Interface"] },
      ],
      costLines: [{ label: "API IA", unit: "mois", qty: 1, unitPriceMad: Math.round(100 + k * 300) }, { label: "Hébergement", unit: "mois", qty: 1, unitPriceMad: 90 }],
      complexity: k > 0.6 ? 3 : 2,
      skillsGap: k > 0.8 ? ["Traitement audio"] : [],
      blockers: [],
      securityNotes: ["Ne pas stocker les enregistrements au-delà de 30 jours"],
    })];
  }
  if (prompt.includes("agent Décideur")) {
    const ids = [...prompt.matchAll(/id=(\S+)/g)].map((m) => m[1]);
    return ["DECIDER", json({
      summary: "Les idées vocales sont compatibles avec le budget ; la demande n'est pas vérifiée.",
      insufficientEvidence: true,
      ideas: ids.map((ideaId) => ({ ideaId, rationale: "Faisable rapidement avec les compétences de l'équipe.", validations: ["10 entretiens terrain"] })),
    })];
  }
  return ["UNKNOWN", json({ error: "agent inconnu" })];
}

http
  .createServer((req, res) => {
    if (req.method === "GET" && req.url === "/__stats") return res.end(json(stats));
    if (req.method === "GET" && req.url === "/__last") return res.end(last);
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const prompt = payload.contents?.map((c) => c.parts?.map((p) => p.text).join("")).join("\n") ?? "";
        last = prompt;
        const [agent, text] = respond(prompt);
        stats.total++;
        stats.byAgent[agent] = (stats.byAgent[agent] ?? 0) + 1;
        res.setHeader("Content-Type", "application/json");
        res.end(json({
          candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP", index: 0 }],
          usageMetadata: { promptTokenCount: Math.ceil(prompt.length / 4), candidatesTokenCount: Math.ceil(text.length / 4), totalTokenCount: 0 },
          modelVersion: "fake-gemma",
        }));
      } catch (e) {
        res.statusCode = 400;
        res.end(json({ error: { message: String(e) } }));
      }
    });
  })
  .listen(PORT, () => console.log(`Faux Gemini sur http://localhost:${PORT}`));
