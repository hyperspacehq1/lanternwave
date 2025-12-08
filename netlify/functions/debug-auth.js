// netlify/functions/debug-auth.js
export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      {
        message: "Debug Auth Function Running",
        incomingHeaders: event.headers,
        authHeader: event.headers.authorization || null,
        cookies: event.headers.cookie || null,
      },
      null,
      2
    ),
  };
};
