// netlify/util/db.js
import pkg from "pg";
const { Client } = pkg;

export async function query(text, params) {
  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    return await client.query(text, params);
  } finally {
    await client.end();
  }
}
