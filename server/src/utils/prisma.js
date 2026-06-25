import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
  adapter: new PrismaPg(
    new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Allow up to 20 concurrent database connections
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 15000, // Time out after 15 seconds waiting for a connection
    })
  ),
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}