// /app/layout.jsx

import "./globals.css";   // <-- global CRT + base styles will go here

export const metadata = {
  title: "LanternWave",
  description: "Real-time synchronized cinematic playback system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="lw-root">
      <body>{children}</body>
    </html>
  );
}
