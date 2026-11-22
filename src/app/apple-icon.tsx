import { ImageResponse } from "next/og";

// Generated Apple touch icon — same "V" mark, 180×180.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        fontSize: 120,
        fontWeight: 700,
      }}
    >
      V
    </div>,
    size,
  );
}
