import { cookies, headers } from "next/headers";
import ProtectedClientProviders from "@/components/ProtectedClientProviders";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }) {
  console.log("🧪 ProtectedLayout ENTERED");

  let cookieStore;
  let headerStore;

  try {
    cookieStore = cookies();
    console.log("🍪 cookies() OK");
  } catch (err) {
    return hardFail("cookies() threw", err);
  }

  try {
    headerStore = headers();
    console.log("🧭 headers() OK");
  } catch (err) {
    return hardFail("headers() threw", err);
  }

  // ===============================
  // 🍪 SAFE COOKIE READ (NO getAll)
  // ===============================
  let lwSession;

  try {
    lwSession = cookieStore.get("lw_session");
    console.log("🍪 lw_session:", {
      exists: !!lwSession,
      length: lwSession?.value?.length,
      hasDot: lwSession?.value?.includes("."),
    });
  } catch (err) {
    return hardFail("cookieStore.get('lw_session') threw", err);
  }

  // ===============================
  // 🔒 AUTH CHECK
  // ===============================
  if (!lwSession?.value) {
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
