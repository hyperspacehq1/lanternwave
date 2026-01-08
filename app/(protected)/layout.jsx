import { cookies, headers } from "next/headers";
import ProtectedClientProviders from "@/components/ProtectedClientProviders";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }) {
  // ===============================
  // 🧪 HARD SERVER ENTRY PROBE
  // ===============================
  console.log("🧪 ProtectedLayout ENTERED");

  let cookieStore;
  let headerStore;

  try {
    cookieStore = cookies();
    console.log("🍪 cookies() OK");
  } catch (err) {
    console.error("❌ cookies() THREW", err);
    return hardFail("cookies() threw", err);
  }

  try {
    headerStore = headers();
    console.log("🧭 headers() OK");
  } catch (err) {
    console.error("❌ headers() THREW", err);
    return hardFail("headers() threw", err);
  }

  // ===============================
  // 🍪 COOKIE INSPECTION
  // ===============================
  let allCookies = [];

  try {
    allCookies = cookieStore.getAll();
    console.log(
      "🍪 All cookies:",
      allCookies.map((c) => ({
        name: c.name,
        length: c.value?.length,
        hasDot: c.value?.includes("."),
      }))
    );
  } catch (err) {
    console.error("❌ getAll() THREW", err);
    return hardFail("cookieStore.getAll() threw", err);
  }

  const lwCookies = allCookies.filter((c) => c.name === "lw_session");

  // ===============================
  // 🔥 DUPLICATE COOKIE HARD STOP
  // ===============================
  if (lwCookies.length > 1) {
    console.error("🔥 DUPLICATE lw_session COOKIES DETECTED", lwCookies);

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
          <h1>🔥 Cookie Collision Detected</h1>
          <p>Multiple <code>lw_session</code> cookies were found.</p>
          <pre>{JSON.stringify(lwCookies, null, 2)}</pre>
          <p>
            This is a hard stop to prevent undefined auth behavior.
            Clear cookies and re-login.
          </p>
        </body>
      </html>
    );
  }

  const lwSession = lwCookies[0];

  // ===============================
  // 🔒 AUTH CHECK
  // ===============================
  const hasSession = !!lwSession?.value;

  if (!hasSession) {
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
          <p>No valid session cookie was found.</p>

          <pre style={{ marginTop: 16 }}>
            {JSON.stringify(
              {
                cookies: allCookies.map((c) => ({
                  name: c.name,
                  preview: c.value?.slice(0, 12) + "…",
                })),
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

  console.log("✅ Auth gate passed, rendering client providers");

  // ===============================
  // ✅ SERVER → CLIENT BOUNDARY
  // ===============================
  return <ProtectedClientProviders>{children}</ProtectedClientProviders>;
}

// ===============================
// ❌ HARD FAILURE RENDER
// ===============================
function hardFail(reason, err) {
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
        <pre>{JSON.stringify({ message: err?.message, stack: err?.stack }, null, 2)}</pre>
      </body>
    </html>
  );
}
