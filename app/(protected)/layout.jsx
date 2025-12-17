import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function ProtectedLayout({ children }) {
  return (
    <>
      <Header variant="app" />
      <main className="lw-main">
        {children}
      </main>
      <Footer variant="protected" />
    </>
  );
}
