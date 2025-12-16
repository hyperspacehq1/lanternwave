import Header from "@/components/Header";
import Link from "next/link";
import "./globals.css";

export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="lw-root">
      <body>
        {/* APP HEADER */}
        <Header />

        {/* MAIN APP CONTENT */}
        <main className="lw-main">
          {children}
        </main>

        {/* APP FOOTER */}
        <footer className="lw-footer">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact Us</Link>
          <Link href="/about">About</Link>
        </footer>
      </body>
    </html>
  );
}
