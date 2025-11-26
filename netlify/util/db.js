// netlify/util/db.js
import { Client } from "@neondatabase/serverless";

export const query = async (sql, params = []) => {
  const client = new Client(process.env.NETLIFY_DATABASE_URL);
  await client.connect();
  const result = await client.query(sql, params);
  await client.end();
  return result;
};
