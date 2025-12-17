import Link from "next/link";

export default function Footer({ variant = "public" }) {
  const isProtected = variant === "protected";

  return (
    <footer className="lw-footer">
      {isProtected ? (
        <>
          <span>Support</span>
          <span>Privacy</span>
          <span>Terms</span>
        </>
      ) : (
        <>
          <Link href="/support">Support</Link>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </>
      )}
    </footer>
  );
}
