export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export function corsResponse(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export function handleOptions() {
  return {
    statusCode: 200,
    headers: {
      ...corsHeaders(),
    },
    body: "",
  };
}
