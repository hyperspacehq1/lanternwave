import Image from "next/image";
import { useState } from "react";

export default function LogoMark({
  src = "/lanterwave-logo.png",
  alt = "Lanterwave Logo",
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
        }}
        className={className}
      >
        LW
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      onError={() => setError(true)}
      priority
    />
  );
}
