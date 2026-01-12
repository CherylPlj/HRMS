// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Helper to ensure DATABASE_URL has pgbouncer parameter
const ensurePgbouncerParam = (url: string | undefined): string | undefined => {
  if (!url) return url;
  
  // Check if pgbouncer parameter already exists
  if (url.includes('pgbouncer=true')) {
    return url;
  }
  
  // Add pgbouncer=true parameter
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}pgbouncer=true`;
};

// Create a new Prisma client with proper pooling settings for Supabase
const createPrismaClient = () => {
  // Use DIRECT_URL for migrations and DATABASE_URL for queries
  // Add pgbouncer=true to disable prepared statements when using connection pooler
  const databaseUrl = ensurePgbouncerParam(process.env.DATABASE_URL);
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

/**
 * Helper to handle prepared statement errors by disconnecting and reconnecting.
 * This is useful when encountering "prepared statement does not exist" errors.
 */
export async function handlePreparedStatementError<T>(
  operation: () => Promise<T>,
  retries = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Check if this is a prepared statement error
    const isPreparedStatementError = 
      error?.code === '26000' || 
      error?.message?.includes('prepared statement') ||
      error?.meta?.code === '26000';
    
    if (isPreparedStatementError && retries > 0) {
      console.warn('Prepared statement error detected, attempting to reconnect...');
      try {
        // Disconnect and reconnect to reset the connection
        await prisma.$disconnect();
        await prisma.$connect();
        // Retry the operation
        return await operation();
      } catch (reconnectError) {
        console.error('Failed to reconnect:', reconnectError);
        throw error; // Throw original error
      }
    }
    throw error;
  }
}
