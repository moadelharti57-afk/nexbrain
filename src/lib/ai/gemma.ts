import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis";
import { runContext } from "./run-context";

export type Usage = { inputTokens: number; outputTokens: number; model: string };
export type JsonResult<T> = { data: T; usage: Usage; attempts: number };

let client: GoogleGenAI | undefined;
function ai() {
  if (!env().GEMINI_API_KEY) throw new Error("GEMINI_API_KEY manquante (ou activez AI_MOCK=true)");
  const baseUrl = env().GEMINI_BASE_URL;
  client ??= new GoogleGenAI({ apiKey: env().GEMINI_API_KEY, ...(baseUrl && { httpOptions: { baseUrl } }) });
  return client;
}

/** Extrait le premier objet JSON d'une réponse texte (tolère ```json … ```). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Aucun objet JSON dans la réponse");
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Appelle Gemma 4 et valide la sortie avec Zod.
 * Le mode JSON natif n'étant pas garanti pour Gemma, on demande du JSON dans le prompt,
 * on l'extrait, on le valide, et on relance avec le message d'erreur si besoin.
 * Les consignes « système » sont intégrées au message utilisateur (plus portable pour Gemma).
 */
export async function generateJson<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  maxRetries?: number;
  temperature?: number;
}): Promise<JsonResult<z.infer<S>>> {
  const model = env().GEMMA_MODEL;
  const usage: Usage = { inputTokens: 0, outputTokens: 0, model };
  const maxRetries = opts.maxRetries ?? 2;
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema));
  const temperature = opts.temperature ?? 0.6;
  let feedback = "";

  // Cache limité à l'analyse en cours : une reprise après échec ne refacture pas les appels
  // déjà réussis, mais une nouvelle analyse (relance volontaire) obtient de nouvelles idées.
  const scope = runContext.getStore()?.runId;
  const ttl = scope ? env().AI_CACHE_TTL_SECONDS : 0;
  const cacheKey = `ai:${scope}:${createHash("sha256").update(JSON.stringify([model, temperature, opts.system, opts.prompt, jsonSchema])).digest("hex")}`;
  if (ttl > 0) {
    const hit = await redis.get(cacheKey).catch(() => null);
    if (hit) {
      const parsed = opts.schema.safeParse(JSON.parse(hit));
      if (parsed.success) return { data: parsed.data, usage: { inputTokens: 0, outputTokens: 0, model: `${model} (cache)` }, attempts: 0 };
    }
  }

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const text =
      `${opts.system}\n\n` +
      `Réponds UNIQUEMENT avec un objet JSON valide conforme à ce JSON Schema, sans texte autour :\n${jsonSchema}\n\n` +
      `${opts.prompt}${feedback}`;

    const res = await ai().models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text }] }],
      config: { temperature },
    });
    usage.inputTokens += res.usageMetadata?.promptTokenCount ?? 0;
    usage.outputTokens += res.usageMetadata?.candidatesTokenCount ?? 0;

    try {
      const parsed = opts.schema.safeParse(extractJson(res.text ?? ""));
      if (parsed.success) {
        if (ttl > 0) await redis.set(cacheKey, JSON.stringify(parsed.data), "EX", ttl).catch(() => {});
        return { data: parsed.data, usage, attempts: attempt };
      }
      feedback = `\n\nTa réponse précédente était invalide : ${z.prettifyError(parsed.error)}\nCorrige-la.`;
    } catch (e) {
      feedback = `\n\nTa réponse précédente n'était pas du JSON valide (${(e as Error).message}). Corrige-la.`;
    }
  }
  throw new Error(`Sortie IA invalide après ${maxRetries + 1} tentatives`);
}
