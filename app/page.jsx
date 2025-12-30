export default function Page() {
  return (
    <html>
      <head>
        <title>Next.js Test</title>
      </head>
      <body style={{ fontFamily: "sans-serif", padding: "40px" }}>
        <h1>✅ Next.js is Running</h1>
        <p>If you can see this, the server and routing are working.</p>
        <p>Time: {new Date().toISOString()}</p>
      </body>
    </html>
  );
}