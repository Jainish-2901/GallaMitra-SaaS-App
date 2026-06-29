import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis;
const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
  max: 10,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 30000,
  ssl: dbUrl && dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

const rawPrisma =
  globalForPrisma.rawPrisma ||
  new PrismaClient({
    adapter: new PrismaPg(pool),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.rawPrisma = rawPrisma;
}

const maxRetries = 4;
const baseDelay = 500; // ms

async function retryQuery(queryFn, args, retries = 0) {
  try {
    return await queryFn(args);
  } catch (error) {
    const isTransient =
      error.code === 'EAI_AGAIN' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNRESET' ||
      error.code === '08P01' || // PostgreSQL connection/authentication timeout
      error.message?.includes('EAI_AGAIN') ||
      error.message?.includes('getaddrinfo') ||
      error.message?.includes('Authentication timed out') ||
      error.message?.includes('timeout') ||
      error.message?.includes('timed out') ||
      error.message?.includes('connection timeout');

    if (isTransient && retries < maxRetries) {
      const delay = baseDelay * Math.pow(2, retries);
      console.warn(`[Prisma Retry] Transient database connectivity issue (${error.code || error.message?.slice(0, 80)}). Retrying query in ${delay}ms... (Attempt ${retries + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryQuery(queryFn, args, retries + 1);
    }
    throw error;
  }
}

export const prisma = rawPrisma.$extends({
  query: {
    async $allOperations({ model, operation, args, query, __internalParams }) {
      // If executing inside an interactive transaction, bypass retry wrapper
      // since failed transaction queries cannot be retried on the same transaction context.
      const isTxClient = !!__internalParams?.transaction;
      if (isTxClient) {
        return query(args);
      }
      return retryQuery(query, args);
    }
  }
});