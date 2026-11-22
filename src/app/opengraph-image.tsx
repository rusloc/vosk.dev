import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

// Default site share card — cream theme, indigo wordmark + tagline. Applies to
// every route unless a route sets its own openGraph.images. 1200×630 (1.91:1).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.title;

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 96,
        background: "#fff8e7",
        color: "#1f1b16",
      }}
    >
      <div style={{ fontSize: 132, fontWeight: 700, color: "#4f46e5" }}>
        VOSK
      </div>
      <div style={{ fontSize: 44, fontWeight: 600, marginTop: 8 }}>
        Power BI &amp; Fabric Consultant
      </div>
      <div style={{ fontSize: 30, marginTop: 28, color: "#6f6a5f" }}>
        Dashboards, data pipelines &amp; analytics that turn raw data into
        decisions.
      </div>
    </div>,
    size,
  );
}
