// netlify/functions/debug-db.js
import pkg from "pg";
const { Client } = pkg;

export const handler = async () => {
  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const now = await client.query("SELECT NOW() AS now");
    const version = await client.query("SHOW server_version");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        {
          ok: true,
          timestamp: now.rows[0].now,
          postgres_version: version.rows[0].server_version,
        },
        null,
        2
      ),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  } finally {
    await client.end();
  }
};

