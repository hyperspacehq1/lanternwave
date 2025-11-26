// netlify/util/db.ts
import { Client } from "@neondatabase/serverless";

export const query = async (text: string, params: any[] = []) => {
  const client = new Client(process.env.NETLIFY_DATABASE_URL);
  await client.connect();
  const result = await client.query(text, params);
  await client.end();
  return result;
};