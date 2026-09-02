import { neon } from "@neondatabase/serverless";

/**
 * Solo la conexion, sin nada mas.
 *
 * Existe separado de lib/db.ts a proposito: db.ts siembra la cuenta admin y por
 * eso importa lib/password.ts, que usa el modulo `crypto` de Node. El middleware
 * corre en Edge Runtime, donde ese modulo no existe, asi que lo que el middleware
 * alcanza (middleware.ts -> lib/session.ts -> este archivo) no puede tocar db.ts.
 * Si algun dia agregas algo aqui, que sea compatible con Edge.
 */
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  "";

export const hasDb = Boolean(connectionString);
export const sql = connectionString ? neon(connectionString) : null;
