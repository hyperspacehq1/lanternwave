import Header from "@/components/Header";
import Link from "next/link";

export default function PublicLayout({ children }) {
  return (
    <>
      <Header variant="public" />

      <main className="lw-main auth-main">
        {children}
      </main>

      <footer className="lw-footer">
        <Link href="/support">Support</Link>
        <Link href="/privacy-policy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </>
  );
}
