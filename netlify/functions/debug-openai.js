// netlify/functions/debug-openai.js
export const handler = async () => {
  const result = {
    ok: false,
    model_count: null,
    error: null,
  };

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    result.ok = true;
    result.model_count = Array.isArray(data.data) ? data.data.length : null;
  } catch (err) {
    result.error = err.message;
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result, null, 2),
  };
};
