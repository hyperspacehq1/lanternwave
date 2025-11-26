// netlify/util/db.js
import { Client, neonConfig } from "@neondatabase/serverless";

// 🔥 REQUIRED FOR NETLIFY — disable WebSockets entirely
neonConfig.webSocketConstructor = undefined;

// 🔥 REQUIRED — ensure HTTP fetch mode is always used
neonConfig.fetchEndpoint = (host, port) => `https://${host}/sql`;

export const query = async (sql, params = []) => {
  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  if (!dbUrl) {
    throw new Error("NETLIFY_DATABASE_URL_UNPOOLED is not set");
  }

  // The client no longer needs fetchEndpoint here
  const client = new Client(dbUrl);

  await client.connect();
  const result = await client.query(sql, params);
  await client.end();
  return result;
};
