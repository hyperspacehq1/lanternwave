import Header from "@/components/Header";

export default async function ProtectedLayout({ children }) {
  // await requireAuth(); ← re-enable later

  return (
    <>
      <Header variant="app" />
      <main className="lw-main">
        {children}
      </main>
    </>
  );
}
