import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.NETLIFY_DATABASE_URL);
export const db = drizzle(sql, { schema });

// Simple query passthrough for old endpoints
export const query = async (strings, ...values) => sql(strings, values);
