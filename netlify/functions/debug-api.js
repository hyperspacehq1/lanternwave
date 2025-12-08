export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      {
        ok: true,
        info: "API debug reachability test",
        method: event.httpMethod,
        path: event.path,
        query: event.queryStringParameters,
        headers: event.headers,
      },
      null,
      2
    ),
  };
};
