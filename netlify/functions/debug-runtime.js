// netlify/functions/debug-runtime.js
export const handler = async (event, context) => {
  const info = {
    node_version: process.version,
    netlify_region: process.env.AWS_REGION || "unknown",
    cold_start: !context?.clientContext,
    event: {
      httpMethod: event.httpMethod,
      path: event.path,
      query: event.queryStringParameters,
    },
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(info, null, 2),
  };
};
