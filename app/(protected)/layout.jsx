import { cookies, headers } from "next/headers";
import ProtectedClientProviders from "@/components/ProtectedClientProviders";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({ children }) {
  const cookieStore = cookies();
  const headerStore = headers();

  let hasSession = false;

  try {
    const lw = cookieStore.get("lw_session");
    hasSession = !!lw?.value;
  } catch (err) {
    console.error("❌ Protected layout cookie error", err);
  }

  // 🔒 No session → block protected pages
  if (!hasSession) {
    return (
      <html lang="en">
        <body
          style={{
            background: "#0b0b0b",
            color: "#e6e6e6",
            fontFamily: "monospace",
            padding: 24,
          }}
        >
          <h1>Unauthorized</h1>
          <p>No session cookie found.</p>

          <pre style={{ marginTop: 16 }}>
            {JSON.stringify(
              {
                cookies: cookieStore.getAll().map((c) => ({
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

  // ✅ Server → Client boundary happens here
  return <ProtectedClientProviders>{children}</ProtectedClientProviders>;
}

