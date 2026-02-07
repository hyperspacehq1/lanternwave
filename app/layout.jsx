import "./globals.css";

export const metadata = {
  title: {
    default: "LanternWave",
    template: "%s | LanternWave",
  },
  description:
    "LanternWave is a modern platform for managing campaigns, players, and game data—built for speed, clarity, and immersive tabletop experiences.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="lw-root">
        {children}
      </body>
    </html>
  );
}