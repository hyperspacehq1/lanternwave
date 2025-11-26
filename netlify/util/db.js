// netlify/util/db.js
import pkg from "pg";
const { Client } = pkg;

function getClient() {
  return new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

export const query = async (sql, params = []) => {
  const client = getClient();
  await client.connect();

  const result = await client.query(sql, params);

  await client.end();
  return result;
};
