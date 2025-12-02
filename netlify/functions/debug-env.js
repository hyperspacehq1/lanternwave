// netlify/functions/debug-env.js
export const handler = async () => {
  const mask = (value) =>
    value ? value.substring(0, 4) + "...[hidden]" : null;

  const vars = {
    OPENAI_API_KEY: mask(process.env.OPENAI_API_KEY),
    NETLIFY_DATABASE_URL: mask(process.env.NETLIFY_DATABASE_URL),
    NETLIFY_DATABASE_URL_UNPOOLED: mask(process.env.NETLIFY_DATABASE_URL_UNPOOLED),
    ADMIN_KEY: mask(process.env.ADMIN_KEY),
    AI_MEMORY_URL: mask(process.env.AI_MEMORY_URL),
    NODE_ENV: process.env.NODE_ENV || null,
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vars, null, 2),
  };
};
