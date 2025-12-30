import Link from "next/link";

export default function Footer() {
  return (
    <footer className="lw-footer">
      <Link href="/support">Support</Link>
      <Link href="/privacy-policy">Privacy</Link>
      <Link href="/terms">Terms</Link>
    </footer>
  );
}
