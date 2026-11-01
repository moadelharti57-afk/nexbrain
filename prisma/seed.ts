/**
 * Données de démonstration — scénario de la présentation (diapositives 13 à 21).
 *   npm run db:seed
 * Crée le compte demo@nexbrain.ma / nexbrain-demo et un brainstorm « Béni Mellal » terminé,
 * avec NexDevis AI, NexCV AI et NexDarija. Toutes les valeurs sont FICTIVES (maquettes) :
 * aucune étude de marché n'a été réalisée, ce que l'interface rappelle (« analyse non vérifiée »).
 * Le script est idempotent : il remplace la démo existante.
 */
import "dotenv/config";
import type { Prisma } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { db } from "../src/lib/db";
import type { CostLine } from "../src/lib/estimate";
import { checkConstraints, costScore, delayScore, rank, weightedScore } from "../src/lib/scoring";
import { DEFAULT_WEIGHTS } from "../src/lib/validation";

const EMAIL = "demo@nexbrain.ma";
const PASSWORD = "nexbrain-demo";

type DemoIdea = {
  name: string;
  pitch: string;
  aiValue: string;
  businessModel: string;
  mvpFeatures: string[];
  feasibility: number;
  demand: number;
  commercial: number;
  costLines: CostLine[];
  /** Fourchette de coût affichée sur les maquettes (prioritaire sur le calcul) */
  cost: [number, number];
  duration: [number, number];
  tasks: { title: string; phase: string; hoursMin: number; hoursMax: number; dependsOn: string[] }[];
  competitors: { name: string; kind: "direct" | "alternative" }[];
  risks: string[];
  questions: string[];
  rationale: string;
};

const MVP_TASKS = (ai: string) => [
  { title: "Conception", phase: "Fondations", hoursMin: 4, hoursMax: 6, dependsOn: [] },
  { title: "Auth + DB", phase: "Fondations", hoursMin: 6, hoursMax: 10, dependsOn: ["Conception"] },
  { title: ai, phase: "Agents", hoursMin: 10, hoursMax: 16, dependsOn: ["Conception"] },
  { title: "Scoring et coûts", phase: "Résultats", hoursMin: 6, hoursMax: 9, dependsOn: [ai] },
  { title: "Dashboard / graphes", phase: "Résultats", hoursMin: 8, hoursMax: 12, dependsOn: ["Auth + DB"] },
  { title: "Tests et reprise", phase: "Recette", hoursMin: 4, hoursMax: 8, dependsOn: ["Scoring et coûts", "Dashboard / graphes"] },
];

// Postes de coût de la diapositive 20 (budget central fictif 850 DH)
const COST_LINES: CostLine[] = [
  { label: "Développement", unit: "forfait", qty: 1, unitPriceMad: 400 },
  { label: "Infrastructure", unit: "mois", qty: 1, unitPriceMad: 100 },
  { label: "API IA", unit: "mois", qty: 1, unitPriceMad: 150 },
  { label: "Services tiers", unit: "mois", qty: 1, unitPriceMad: 80 },
  { label: "Tests et imprévus", unit: "forfait", qty: 1, unitPriceMad: 120 },
];

const IDEAS: { problem: { title: string; description: string; affectedUsers: string; consequences: string; frequency: number }; idea: DemoIdea }[] = [
  {
    problem: {
      title: "Les artisans perdent du temps à formaliser leurs devis",
      description: "Les devis sont rédigés à la main ou sur WhatsApp, souvent le soir, avec des oublis.",
      affectedUsers: "Artisans, petites entreprises du bâtiment",
      consequences: "Devis tardifs, clients perdus",
      frequency: 5,
    },
    idea: {
      name: "NexDevis AI",
      pitch: "Devis depuis un message vocal → champs structurés → PDF.",
      aiValue: "Transcription de la voix (darija / français) et extraction des postes, quantités et prix.",
      businessModel: "Abonnement mensuel pour artisans, essai gratuit",
      mvpFeatures: ["Upload vocal", "Extraction des champs", "Validation par l'artisan", "Génération PDF"],
      feasibility: 91,
      demand: 80,
      commercial: 78,
      costLines: COST_LINES,
      cost: [350, 800],
      duration: [3, 6],
      tasks: MVP_TASKS("Transcription + extraction"),
      competitors: [{ name: "Excel / Word", kind: "alternative" }, { name: "Carnet de devis papier", kind: "alternative" }],
      risks: ["Habitude du papier et de WhatsApp", "Qualité de la transcription en darija"],
      questions: ["Combien de devis par semaine ?", "Combien de temps par devis aujourd'hui ?", "Prix mensuel acceptable ?"],
      rationale: "Budget compatible et MVP accessible ; besoin commercial encore à confirmer.\n• 10 entretiens avec des artisans de Béni Mellal\n• Tester la transcription sur 20 messages réels",
    },
  },
  {
    problem: {
      title: "Les chercheurs d'emploi peinent à rédiger un CV structuré",
      description: "Les jeunes diplômés ne savent pas valoriser leur parcours dans un CV clair.",
      affectedUsers: "Jeunes diplômés, demandeurs d'emploi",
      consequences: "Candidatures moins visibles",
      frequency: 4,
    },
    idea: {
      name: "NexCV AI",
      pitch: "CV construit depuis un entretien guidé.",
      aiValue: "Questions adaptatives puis reformulation des expériences en compétences.",
      businessModel: "Gratuit + export premium",
      mvpFeatures: ["Entretien guidé", "Reformulation", "Modèles de CV", "Export PDF"],
      feasibility: 88,
      demand: 70,
      commercial: 65,
      costLines: COST_LINES.map((l) => (l.label === "Développement" ? { ...l, unitPriceMad: 350 } : l)),
      cost: [300, 700],
      duration: [3, 5],
      tasks: MVP_TASKS("Entretien + reformulation"),
      competitors: [{ name: "Canva", kind: "direct" }, { name: "Modèles Word", kind: "alternative" }],
      risks: ["Concurrence d'outils gratuits", "Monétisation difficile"],
      questions: ["Les recruteurs locaux lisent-ils les CV en ligne ?", "Prêt à payer un export ?"],
      rationale: "Très faisable et rapide ; potentiel commercial plus faible face aux outils gratuits.\n• Tester avec 15 étudiants\n• Valider un partenariat avec une école",
    },
  },
  {
    problem: {
      title: "Les documents administratifs sont difficiles à comprendre",
      description: "Courriers et formulaires en français administratif mal compris.",
      affectedUsers: "Habitants peu familiers du français administratif",
      consequences: "Démarches abandonnées ou erronées",
      frequency: 4,
    },
    idea: {
      name: "NexDarija",
      pitch: "Documents expliqués en darija.",
      aiValue: "Photo du document, puis explication simple et étapes à suivre en darija.",
      businessModel: "Partenariats associations / collectivités (B2G)",
      mvpFeatures: ["Photo du document", "OCR", "Explication en darija", "Liste des étapes"],
      feasibility: 78,
      demand: 82,
      commercial: 75,
      costLines: [...COST_LINES, { label: "OCR", unit: "mois", qty: 1, unitPriceMad: 250 }],
      cost: [600, 1200],
      duration: [5, 9],
      tasks: [...MVP_TASKS("OCR + explication"), { title: "Relecture darija", phase: "Recette", hoursMin: 4, hoursMax: 8, dependsOn: ["OCR + explication"] }],
      competitors: [{ name: "Aide d'un proche", kind: "alternative" }, { name: "Écrivain public", kind: "alternative" }],
      risks: ["Erreurs d'interprétation juridique", "Confidentialité des documents"],
      questions: ["Quels documents posent le plus problème ?", "Une association serait-elle partenaire ?"],
      rationale: "Fort impact et demande supposée élevée ; coût maximal au-dessus du budget et délai serré.\n• Vérifier la qualité de l'OCR sur des documents réels\n• Valider le cadre de confidentialité",
    },
  },
];

const OTHER_PROBLEMS = [
  { title: "Les petits commerces suivent mal leurs stocks", description: "Cahier papier, ruptures fréquentes.", affectedUsers: "Épiceries", consequences: "Ventes perdues", frequency: 3 },
  { title: "Les patients oublient leurs rendez-vous", description: "Pas de rappel automatique dans les petits cabinets.", affectedUsers: "Patients, cabinets", consequences: "Créneaux perdus", frequency: 3 },
];

async function main() {
  const existing = await db.user.findUnique({ where: { email: EMAIL } });
  if (existing) await db.user.delete({ where: { id: existing.id } });

  const user = await db.user.create({
    data: { email: EMAIL, name: "Équipe NERDS", passwordHash: await hashPassword(PASSWORD), preferences: { weights: DEFAULT_WEIGHTS } },
  });

  const b = await db.brainstorm.create({
    data: {
      userId: user.id,
      title: "Services locaux — Béni Mellal",
      mode: "QUICK",
      status: "COMPLETED",
      city: "Béni Mellal",
      country: "Maroc",
      description: "Une micro-application IA utile au quotidien, démontrable rapidement.",
      budgetMaxMad: 1000,
      deadlineDays: 7,
      teamSize: 4,
      skills: ["Next.js", "APIs IA"],
      targetAudience: "Habitants et PME",
      marketType: "B2C",
      zone: "LOCAL",
      weights: DEFAULT_WEIGHTS,
    },
  });

  const scored: { id: string; total: number; blocked: boolean; reasons: string[]; criteria: Record<string, number> }[] = [];
  for (const { problem, idea } of IDEAS) {
    const p = await db.problem.create({
      data: {
        brainstormId: b.id,
        ...problem,
        selected: true,
        evidence: { create: [{ kind: "HYPOTHESIS", statement: "Fréquence supposée, non vérifiée", validation: "Interroger 10 personnes concernées" }] },
      },
    });
    // Fourchette des maquettes ; coût central = milieu de la fourchette (cohérent avec min/max affichés)
    const costCentralMad = Math.round((idea.cost[0] + idea.cost[1]) / 2);
    const i = await db.idea.create({
      data: {
        problemId: p.id,
        name: idea.name,
        pitch: idea.pitch,
        aiValue: idea.aiValue,
        businessModel: idea.businessModel,
        mvpFeatures: idea.mvpFeatures,
        marketAnalysis: {
          create: {
            competitors: idea.competitors,
            adoptionRisks: idea.risks,
            fieldQuestions: idea.questions,
            demandScore: idea.demand,
            commercialScore: idea.commercial,
            verified: false,
          },
        },
        techEstimate: {
          create: {
            architecture: "Next.js + Gemma 4 (API Gemini) + PostgreSQL",
            costMinMad: idea.cost[0],
            costCentralMad,
            costMaxMad: idea.cost[1],
            costLines: idea.costLines,
            durationMinDays: idea.duration[0],
            durationMaxDays: idea.duration[1],
            feasibility: idea.feasibility,
            blockers: [],
            securityNotes: ["Clés API côté serveur", "Suppression des fichiers après traitement"],
          },
        },
        tasks: { create: idea.tasks.map((t, order) => ({ ...t, order })) },
        evidence: {
          create: [
            { kind: "HYPOTHESIS", statement: "Demande supposée à partir du scénario, non vérifiée", validation: idea.questions[0] },
            { kind: "CONSTRAINT", statement: "Budget 1 000 DH et délai 7 jours" },
          ],
        },
      },
    });
    const criteria = {
      feasibility: idea.feasibility,
      cost: costScore(costCentralMad, b.budgetMaxMad),
      delay: delayScore(idea.duration[1], b.deadlineDays),
      demand: idea.demand,
      commercial: idea.commercial,
    };
    const { blocked, reasons } = checkConstraints(
      { costMinMad: idea.cost[0], costMaxMad: idea.cost[1], durationMinDays: idea.duration[0], durationMaxDays: idea.duration[1] },
      b,
    );
    scored.push({ id: i.id, total: weightedScore(criteria, DEFAULT_WEIGHTS), blocked, reasons, criteria });
    await db.score.create({
      data: { ideaId: i.id, ...criteria, total: 0, weights: DEFAULT_WEIGHTS, blocked, blockReasons: reasons, rationale: idea.rationale },
    });
  }

  for (const r of rank(scored)) {
    const verified = false;
    await db.score.update({ where: { ideaId: r.id }, data: { total: r.total, rank: r.rank } });
    await db.idea.update({ where: { id: r.id }, data: { status: r.blocked ? "REJECTED" : verified ? "WITHIN_CONSTRAINTS" : "TO_VERIFY" } });
  }
  for (const p of OTHER_PROBLEMS) await db.problem.create({ data: { brainstormId: b.id, ...p } });

  const decision = {
    summary: "NexDevis AI est priorisée : compatible avec le budget et le délai, MVP simple. La demande reste à vérifier sur le terrain avant tout investissement.",
    insufficientEvidence: true,
    ideas: [],
  };
  await db.brainstorm.update({ where: { id: b.id }, data: { extra: { decision } as Prisma.InputJsonValue } });

  // Exécution et version figée, comme après un vrai passage des agents
  await db.run.create({
    data: {
      brainstormId: b.id,
      status: "SUCCEEDED",
      startedAt: new Date(),
      finishedAt: new Date(),
      executions: {
        create: (["EXPLORER", "INNOVATOR", "ANALYST", "TECHNICAL", "DECIDER"] as const).map((agent) => ({
          agent,
          status: "SUCCEEDED" as const,
          model: "démo",
          startedAt: new Date(),
          finishedAt: new Date(),
        })),
      },
    },
  });
  const full = await db.brainstorm.findUniqueOrThrow({
    where: { id: b.id },
    include: {
      problems: {
        include: {
          evidence: true,
          ideas: { include: { marketAnalysis: true, techEstimate: true, score: true, tasks: true, evidence: true } },
        },
      },
    },
  });
  await db.brainstormVersion.create({ data: { brainstormId: b.id, version: 1, snapshot: JSON.parse(JSON.stringify(full)) } });
  await db.brainstorm.update({ where: { id: b.id }, data: { version: 2 } });

  console.log(`Démo prête : ${EMAIL} / ${PASSWORD}`);
  for (const r of rank(scored).sort((a, z) => (a.rank ?? 99) - (z.rank ?? 99))) {
    const name = IDEAS[scored.findIndex((s) => s.id === r.id)].idea.name;
    console.log(`  #${r.rank ?? "—"} ${name.padEnd(12)} ${r.total}/100  ${JSON.stringify(r.criteria)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
