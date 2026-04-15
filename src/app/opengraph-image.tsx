import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getBaseUrl } from "@/lib/seo";

export const alt =
  "OmniTrak — Your one-stop personal tracker for everything";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Same wordmark as headers (`public/omnitrak-logo.png` + `SiteLogo`). */
export default async function OpenGraphImage() {
  const host = (() => {
    try {
      return new URL(getBaseUrl()).hostname;
    } catch {
      return "";
    }
  })();

  const logoBuffer = await readFile(
    join(process.cwd(), "public", "omnitrak-logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

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
          /* Align with landing hero: emerald-600 → emerald-700 → teal-900 */
          background:
            "linear-gradient(135deg, #059669 0%, #047857 48%, #134e4a 100%)",
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
          <img
            src={logoSrc}
            alt=""
            width={560}
            height={112}
            style={{ objectFit: "contain", marginBottom: 28 }}
          />
          <div style={{ fontSize: 28, opacity: 0.95, maxWidth: 720, marginBottom: 32 }}>
            Your one-stop personal tracker for everything
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
            {host ? `Try it free at ${host} →` : "Try it free →"}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
