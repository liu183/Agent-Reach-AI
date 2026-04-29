import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const isProduction = process.env.NODE_ENV === 'production';

  // In production (Vercel), use connection pooling via DATABASE_URL
  // DIRECT_DATABASE_URL is used for migrations (Prisma Migrate)
  if (isProduction && process.env.DATABASE_URL) {
    return new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  // Development / local: use SQLite or whatever DATABASE_URL points to
  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
