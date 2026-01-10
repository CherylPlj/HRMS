// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Create a new Prisma client with proper pooling settings for Supabase
const createPrismaClient = () => {
  // Use DIRECT_URL for migrations and DATABASE_URL for queries
  // Add pgbouncer=true to disable prepared statements when using connection pooler
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
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
  try {
    await prisma.$connect();
  } catch (error: any) {
    // If already connected, the error will be about that - we can ignore it
    if (error?.message?.includes('already connected') || error?.code === 'P1000') {
      // Already connected, that's fine
      return;
    }
    console.error('Prisma connection error:', error);
  }
}
