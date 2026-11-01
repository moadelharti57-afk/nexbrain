import { z } from "zod";

/** Schémas de sortie des agents (contrats JSON typés, validés par Zod). */

export const evidenceSchema = z.object({
  kind: z.enum(["FACT", "ESTIMATE", "HYPOTHESIS", "CONSTRAINT"]),
  statement: z.string().min(1),
  sourceUrl: z.url().optional(),
  sourceTitle: z.string().optional(),
  sourceDate: z.string().optional(),
  excerpt: z.string().optional(),
  validation: z.string().optional(),
});

export const explorerOutput = z.object({
  problems: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        description: z.string().min(10),
        affectedUsers: z.string(),
        consequences: z.string(),
        frequency: z.number().int().min(1).max(5),
        evidence: z.array(evidenceSchema).default([]),
      }),
    )
    .min(1)
    .max(20),
});

export const innovatorOutput = z.object({
  ideas: z
    .array(
      z.object({
        problemIndex: z.number().int().min(0),
        name: z.string().min(2).max(80),
        pitch: z.string().min(10),
        aiValue: z.string().min(10),
        businessModel: z.string(),
        mvpFeatures: z.array(z.string()).min(1).max(10),
      }),
    )
    .min(1),
});

export const analystOutput = z.object({
  competitors: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["direct", "alternative"]),
      url: z.url().optional(),
      price: z.string().optional(),
    }),
  ),
  adoptionRisks: z.array(z.string()),
  fieldQuestions: z.array(z.string()).min(1),
  demandScore: z.number().int().min(0).max(100),
  commercialScore: z.number().int().min(0).max(100),
  evidence: z.array(evidenceSchema).default([]),
});

export const technicalOutput = z.object({
  architecture: z.string(),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        phase: z.string().optional(),
        hoursMin: z.number().min(0),
        hoursMax: z.number().min(0),
        dependsOn: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  costLines: z.array(
    z.object({
      label: z.string(),
      unit: z.string(),
      qty: z.number().min(0),
      unitPriceMad: z.number().min(0),
      priceDate: z.string().optional(),
    }),
  ),
  /** 1 = trivial, 5 = très complexe */
  complexity: z.number().int().min(1).max(5),
  skillsGap: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  securityNotes: z.array(z.string()).default([]),
});

export const deciderOutput = z.object({
  summary: z.string(),
  insufficientEvidence: z.boolean(),
  ideas: z.array(
    z.object({
      ideaId: z.string(),
      rationale: z.string(),
      validations: z.array(z.string()),
    }),
  ),
});

export type ExplorerOutput = z.infer<typeof explorerOutput>;
export type InnovatorOutput = z.infer<typeof innovatorOutput>;
export type AnalystOutput = z.infer<typeof analystOutput>;
export type TechnicalOutput = z.infer<typeof technicalOutput>;
export type DeciderOutput = z.infer<typeof deciderOutput>;
