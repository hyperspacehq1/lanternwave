const { Client } = require("pg");

async function query(text, params) {
  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    await client.end();
  }
}

module.exports = {
  query,
};
