import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: env().DATABASE_URL });
  return new PrismaClient({ adapter });
}

/** Instance unique par processus (évite d'épuiser le pool en dev / HMR). */
export const db = globalForPrisma.prisma ?? createClient();
if (env().NODE_ENV !== "production") globalForPrisma.prisma = db;
