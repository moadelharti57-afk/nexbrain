/** Libellés et tonalités d'affichage partagés. */
export const BRAINSTORM_STATUS = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  RUNNING: { label: "En cours", tone: "info" },
  COMPLETED: { label: "Terminé", tone: "success" },
  FAILED: { label: "Échec", tone: "danger" },
  ARCHIVED: { label: "Archivé", tone: "neutral" },
} as const;

export const IDEA_STATUS = {
  PROPOSED: { label: "Proposée", tone: "neutral" },
  ANALYZED: { label: "Analysée", tone: "neutral" },
  WITHIN_CONSTRAINTS: { label: "Dans les contraintes", tone: "success" },
  TO_VERIFY: { label: "À vérifier", tone: "warning" },
  REJECTED: { label: "Hors contraintes", tone: "danger" },
  CHOSEN: { label: "Choisie", tone: "info" },
} as const;

export const EVIDENCE_KIND = {
  FACT: { label: "Fait sourcé", tone: "success" },
  ESTIMATE: { label: "Estimation", tone: "info" },
  HYPOTHESIS: { label: "Hypothèse", tone: "warning" },
  CONSTRAINT: { label: "Contrainte", tone: "danger" },
} as const;

export const AGENT_LABEL = {
  EXPLORER: "Explorateur",
  INNOVATOR: "Innovateur",
  ANALYST: "Analyste",
  TECHNICAL: "Technique",
  DECIDER: "Décideur",
} as const;

export const CRITERIA_LABEL = {
  feasibility: "Faisabilité",
  cost: "Coût",
  delay: "Délai",
  demand: "Demande / marché",
  commercial: "Potentiel commercial",
} as const;

/** Libellés courts pour les axes de graphiques. */
export const CRITERIA_SHORT = {
  feasibility: "Faisabilité",
  cost: "Coût",
  delay: "Délai",
  demand: "Demande",
  commercial: "Potentiel",
} as const;

export const mad = (n: number) => `${n.toLocaleString("fr-FR")} DH`;
export const range = (a: number, b: number, unit: string) => (a === b ? `${a} ${unit}` : `${a}–${b} ${unit}`);
