import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Sign In | Lanternwave - Immersive RPG Campaign Management",
  description: "Lanternwave helps Game Masters run immersive tabletop RPG campaigns with dynamic media, player views, and powerful campaign tools.",
  openGraph: {
    title: "Sign In | Lanternwave",
    description: "Lanternwave helps Game Masters run immersive tabletop RPG campaigns with dynamic media, player views, and powerful campaign tools.",
  },
};

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
