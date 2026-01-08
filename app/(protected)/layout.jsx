import { cookies, headers } from "next/headers";
import ProtectedHeader from "@/components/ProtectedHeader";
import Footer from "@/components/Footer";
import { GlobalAudioProvider } from "@/components/GlobalAudio";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }) {
  let hasSession = false;
  let authError = null;

  // ✅ Correct stores
  const cookieStore = cookies();
  const headerStore = headers();

  // 🔍 Collect low-level request info (SAFE in Server Components)
  const debug = {
    cookies: cookieStore.getAll().map((c) => ({
      name: c.name,
      preview: c.value?.slice(0, 12) + "…",
    })),
    userAgent: headerStore.get("user-agent"),
    host: headerStore.get("host"),
  };

  try {
    // Layouts cannot validate auth — only check presence
    const lw = cookieStore.get("lw_session");
    hasSession = !!lw;
  } catch (err) {
    authError = {
      message: err?.message || String(err),
      name: err?.name,
    };

    console.error("🛑 PROTECTED LAYOUT COOKIE CHECK FAILED", {
      authError,
      debug,
    });
  }

  // 🚨 DEBUG MODE: show screen instead of redirect
  if (!hasSession) {
    return (
      <html>
        <body
          style={{
            background: "#0b0b0b",
            color: "#e6e6e6",
            fontFamily: "monospace",
            padding: 24,
          }}
        >
          <h1>🛑 Protected Layout: No Session Cookie</h1>

          <h2>Auth Error</h2>
          <pre>{JSON.stringify(authError, null, 2)}</pre>

          <h2>Request Debug</h2>
          <pre>{JSON.stringify(debug, null, 2)}</pre>

          <h2>What this means</h2>
          <ul>
            <li>The lw_session cookie is missing</li>
            <li>Login/signup did not set a cookie</li>
            <li>OR cookie is not visible to Server Components</li>
          </ul>

          <p>
            <a href="/login" style={{ color: "#6cc5f0" }}>
              ← Back to Login
            </a>
          </p>
        </body>
      </html>
    );
  }

  // ✅ Cookie present → allow render
  return (
    <GlobalAudioProvider>
      <ProtectedHeader />
      <main className="lw-main">{children}</main>
      <Footer variant="protected" />
    </GlobalAudioProvider>
  );
}
