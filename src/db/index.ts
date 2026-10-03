import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { pool?: Pool; db?: DB };

/**
 * The database connection is made on first use, not when the app is built.
 * So a deploy still builds even before DATABASE_URL is set; pages then show
 * a clear message until the link is added.
 */
function getDb(): DB {
  if (globalForDb.db) return globalForDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is missing. Add your Neon connection string to .env (or to Vercel → Settings → Environment Variables).");
  }
  // SSL comes from the connection string (?sslmode=require on Neon)
  const pool = globalForDb.pool ?? new Pool({ connectionString: url, max: 5 });
  globalForDb.pool = pool;
  globalForDb.db = drizzle(pool, { schema });
  return globalForDb.db;
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
