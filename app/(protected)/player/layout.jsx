import Header from "@/components/Header";

export default function PlayerLayout({ children }) {
  return (
    <>
      {/* Logo only — no nav */}
      <Header variant="player" />
      {children}
    </>
  );
}
