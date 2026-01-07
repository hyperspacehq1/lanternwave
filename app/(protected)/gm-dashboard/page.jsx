import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function GMDashboardDebugPage() {
  let error = null;
  let content = null;

  const debug = {
    cookies: cookies().getAll().map(c => ({
      name: c.name,
      preview: c.value?.slice(0, 12) + "…",
    })),
    headers: {
      userAgent: headers().get("user-agent"),
      host: headers().get("host"),
    },
  };

  try {
    // ⛔ DO NOT import anything else yet
    content = (
      <div>
        <h2>GM Dashboard Base Render OK</h2>
        <p>If you see this, the crash is in a child import.</p>
      </div>
    );
  } catch (err) {
    error = {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
    };
  }

  if (error) {
    return (
      <pre style={{ padding: 24 }}>
        {JSON.stringify({ error, debug }, null, 2)}
      </pre>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>🧪 GM Dashboard Debug</h1>
      <pre>{JSON.stringify(debug, null, 2)}</pre>
      {content}
    </div>
  );
}
