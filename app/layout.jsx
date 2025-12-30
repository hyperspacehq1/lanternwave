import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="lw-root">
        {children}
      </body>
    </html>
  );
}
