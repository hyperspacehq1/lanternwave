import Header from "@/components/Header";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PublicLayout({ children }) {
  return (
    <>
      <Header variant="public" />

      {children}

      <footer className="lw-footer">
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact Us</Link>
        <Link href="/about">About</Link>
      </footer>
    </>
  );
}
