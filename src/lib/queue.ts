import { Queue } from "bullmq";
import { redis } from "./redis";

export const RUN_QUEUE = "nexbrain-runs";

export type RunJobData = { runId: string };

const g = globalThis as unknown as { runQueue?: Queue<RunJobData> };

export const runQueue =
  g.runQueue ??
  new Queue<RunJobData>(RUN_QUEUE, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    },
  });
g.runQueue = runQueue;
