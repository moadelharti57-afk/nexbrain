import "dotenv/config";
import { UnrecoverableError, Worker } from "bullmq";
import { db } from "@/lib/db";
import { executeRun, QuotaExceeded } from "@/lib/orchestrator";
import { RUN_QUEUE, runQueue, type RunJobData } from "@/lib/queue";
import { redis } from "@/lib/redis";

/**
 * Worker NexBrain : exécute les workflows d'agents hors du processus web.
 * Les jobs sont persistés dans Redis → reprise après coupure ; chaque nouvelle
 * tentative reprend à l'agent qui a échoué (voir executeRun).
 */
const worker = new Worker<RunJobData>(
  RUN_QUEUE,
  async (job) => {
    const attempt = job.attemptsMade + 1;
    console.log(`[run ${job.data.runId}] tentative ${attempt}`);
    try {
      await executeRun(job.data.runId, { finalAttempt: attempt >= (job.opts.attempts ?? 1) });
    } catch (err) {
      // Quota / plafond : retenter ne servirait à rien
      if (err instanceof QuotaExceeded) throw new UnrecoverableError(err.message);
      throw err;
    }
  },
  { connection: redis, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2) },
);

worker.on("completed", (job) => console.log(`[run ${job.data.runId}] terminé`));
worker.on("failed", (job, err) => console.error(`[run ${job?.data.runId}] échec : ${err.message}`));

/**
 * Au démarrage : un run QUEUED/RUNNING sans job actif dans Redis (Redis vidé, job perdu,
 * worker tué pendant l'exécution puis job expiré…) est remis en file. executeRun reprend
 * à l'agent interrompu.
 */
async function recoverRuns() {
  const pending = await db.run.findMany({ where: { status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } });
  let requeued = 0;
  for (const { id } of pending) {
    const job = await runQueue.getJob(id);
    const state = job ? await job.getState() : "missing";
    if (["waiting", "active", "delayed", "prioritized", "waiting-children"].includes(state)) continue;
    if (job) await job.remove().catch(() => {});
    await runQueue.add("run", { runId: id }, { jobId: id });
    requeued++;
  }
  if (requeued) console.log(`${requeued} analyse(s) remise(s) en file`);
}

async function shutdown() {
  console.log("Arrêt du worker…");
  await worker.close();
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

recoverRuns()
  .catch((e) => console.error("Reprise des analyses impossible :", e))
  .finally(() => console.log(`Worker NexBrain prêt (file « ${RUN_QUEUE} »)`));
