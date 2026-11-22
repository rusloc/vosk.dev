import { ImageResponse } from "next/og";

// Generated favicon — "V" mark: hero-bars orange BG, "money"-indigo letter. No static asset.
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FF991C",
        color: "#4f46e5",
        fontSize: 34,
        fontWeight: 700,
      }}
    >
      V
    </div>,
    size,
  );
}
