import IORedis from "ioredis";
import { env } from "./env";

const g = globalThis as unknown as { redis?: IORedis };

/** maxRetriesPerRequest: null est requis par BullMQ. */
export const redis =
  g.redis ?? new IORedis(env().REDIS_URL, { maxRetriesPerRequest: null });
if (env().NODE_ENV !== "production") g.redis = redis;
