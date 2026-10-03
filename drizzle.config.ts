import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DIRECT_URL (optional) is the non-pooled Neon link, best for creating tables
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
