import { ImageResponse } from "next/og";

export const alt = "Financial Tracker — Simple cashflow tracker for take-home pay and expenses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #166534 0%, #15803d 50%, #16a34a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            color: "white",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 16 }}>
            Financial Tracker
          </div>
          <div style={{ fontSize: 28, opacity: 0.95, maxWidth: 640, marginBottom: 32 }}>
            Simple cashflow tracker — track take-home pay and expenses by category
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              background: "rgba(255,255,255,0.2)",
              padding: "12px 24px",
              borderRadius: 8,
              border: "2px solid rgba(255,255,255,0.9)",
            }}
          >
            Try it free at fin-track.cloud →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
