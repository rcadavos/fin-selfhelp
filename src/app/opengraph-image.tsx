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
          <div style={{ fontSize: 28, opacity: 0.95, maxWidth: 640 }}>
            Simple cashflow tracker — track take-home pay and expenses by category
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
