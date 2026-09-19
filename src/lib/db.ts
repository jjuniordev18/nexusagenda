const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined
}

const db = (() => {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return null;
  }
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  
  const { PrismaClient } = require('@prisma/client');
  return new PrismaClient();
})();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export { db as default };