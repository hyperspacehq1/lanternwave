export const dynamic = "force-dynamic";

export default function MobileUnsupportedPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          maxWidth: "280px",
          width: "100%",
          marginBottom: "2rem",
        }}
      >
        <source src="/lanternwave-logo.mp4" type="video/mp4" />
      </video>

      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "1rem",
          lineHeight: 1.5,
          maxWidth: "300px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        LanternWave is not available on mobile.
        <br />
        Please visit on a computer, laptop, or tablet.
      </p>
    </div>
  );
}