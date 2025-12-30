import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PublicLayout({ children }) {
  return (
    <>
      <Header variant="public" />

      <main className="lw-main auth-main">
        {children}
      </main>

      <Footer variant="public" />
    </>
  );
}
