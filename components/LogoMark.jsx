import Image from "next/image";
import { useState } from "react";

export default function LogoMark({
  src = "/lanternwave-logo.png",
  alt = "Lanternwave Logo",
  size = 96,
  className = "",
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: "#063b49",
          border: "1px solid #2a84a6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#87e8ff",
          fontFamily: "var(--font-muther, monospace)",
          fontSize: size * 0.22,
          transform: "none",
        }}
        className={`lw-logo ${className}`}
      >
        LW
      </div>
    );
  }

  return (
    <span
      className={`lw-logo-wrap ${className}`}
      style={{ display: "inline-flex", alignItems: "center", transform: "none" }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="lw-logo"
        style={{
          transform: "none",
          rotate: "0deg",
          WebkitTransform: "none",
        }}
        onError={() => setError(true)}
        priority
      />
    </span>
  );
}
