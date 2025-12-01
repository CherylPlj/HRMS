// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // In production (Vercel): create a new client per function execution
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  // In dev: prevent multiple instances during hot reload
  const globalWithPrisma = globalThis as typeof globalThis & {
    prisma?: PrismaClient;
  };

  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }

  prisma = globalWithPrisma.prisma;
}

// Handle connection errors and reconnect
prisma.$connect().catch((err) => {
  console.error('Prisma connection error:', err);
});

export { prisma };
