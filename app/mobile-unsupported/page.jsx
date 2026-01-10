export const dynamic = "force-dynamic";

export default function MobileUnsupportedPage() {
  return (
    <div className="lw-nostromo">
      <div className="terminal">
        <h1>LANTERNWAVE MAINFRAME 9.1011</h1>

        <p>
          INITIALIZING INTERFACE…
          <br />
          SYSTEM CAPABILITY CHECK FAILED
        </p>

        <p style={{ marginTop: 12 }}>
          LanternWave does not support mobile phones due to the
          complexity of the user interface and the volume of
          screens and data.
        </p>

        <p style={{ marginTop: 12 }}>
          Please access this system using a computer,
          laptop, or tablet.
        </p>

        <div className="status">SIGNAL LOST ▌▌▌</div>
      </div>
    </div>
  );
}
