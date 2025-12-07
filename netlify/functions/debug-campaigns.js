export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ok: true,
      message: "Classic handler works",
      method: event.httpMethod,
      query: event.queryStringParameters,
      raw: event
    })
  };
};
