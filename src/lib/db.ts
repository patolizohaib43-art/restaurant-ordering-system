import { PrismaClient } from '@prisma/client';

// Prevents creating a new PrismaClient on every hot-reload in development,
// which would otherwise exhaust the Postgres connection pool.
declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const db =
  global.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaGlobal = db;
}
