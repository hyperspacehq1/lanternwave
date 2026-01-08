import { headers } from "next/headers";
import ProtectedClientProviders from "@/components/ProtectedClientProviders";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }) {
  console.log("🧪 ProtectedLayout ENTERED");

  let headerStore;
  let cookieHeader = "";

  try {
    headerStore = headers();
    cookieHeader = headerStore.get("cookie") || "";
    console.log("🧭 Raw cookie header:", cookieHeader.slice(0, 120));
  } catch (err) {
    return hardFail("headers() threw", err);
  }

  // ===============================
  // 🍪 MANUAL COOKIE PARSE (SAFE)
  // ===============================
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        if (idx === -1) return [];
        return [c.slice(0, idx), c.slice(idx + 1)];
      })
  );

  const lwSession = cookies["lw_session"];

  console.log("🍪 lw_session present:", !!lwSession);

  // ===============================
  // 🔒 AUTH CHECK
  // ===============================
  if (!lwSession) {
    console.warn("🚫 No lw_session cookie found");

    return (
      <html lang="en">
        <body
          style={{
            padding: 24,
            background: "#0b0b0b",
            color: "#e6e6e6",
            fontFamily: "monospace",
          }}
        >
          <h1>Unauthorized</h1>
          <p>No session cookie found.</p>

          <pre style={{ marginTop: 16 }}>
            {JSON.stringify(
              {
                host: headerStore.get("host"),
                ua: headerStore.get("user-agent"),
                cookieHeader,
              },
              null,
              2
            )}
          </pre>

          <p style={{ marginTop: 16 }}>
            <a href="/login" style={{ color: "#6cc5f0" }}>
              ← Back to login
            </a>
          </p>
        </body>
      </html>
    );
  }

  console.log("✅ Auth gate passed");

  // ===============================
  // ✅ SERVER → CLIENT BOUNDARY
  // ===============================
  return <ProtectedClientProviders>{children}</ProtectedClientProviders>;
}

// ===============================
// ❌ HARD FAILURE RENDER
// ===============================
function hardFail(reason, err) {
  console.error("❌ ProtectedLayout hard fail:", reason, err);

  return (
    <html lang="en">
      <body
        style={{
          padding: 24,
          background: "#0b0b0b",
          color: "#ff5555",
          fontFamily: "monospace",
        }}
      >
        <h1>❌ Protected Layout Crash</h1>
        <p>{reason}</p>
        <pre>
          {JSON.stringify(
            { message: err?.message, stack: err?.stack },
            null,
            2
          )}
        </pre>
      </body>
    </html>
  );
}
