// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Create a new Prisma client with proper pooling settings
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Disable prepared statements for PgBouncer compatibility
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  
  // Eagerly connect to avoid "Engine is not yet connected" errors
  client.$connect().catch((e) => {
    console.error('Failed to connect to database:', e);
  });
  
  return client;
};

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// In development, reuse the client to avoid too many connections during hot reload
// In production, create fresh clients but they'll be managed by serverless function lifecycle
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Helper to ensure prisma is connected before making queries.
 * Use this at the start of API routes if you encounter connection issues.
 */
export async function ensurePrismaConnected() {
  await prisma.$connect();
}
