import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getBaseUrl } from "@/lib/seo";

export const alt =
  "OmniTrak — Your all-in-one finance tracker, now with AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const host = (() => {
    try {
      return new URL(getBaseUrl()).hostname;
    } catch {
      return "";
    }
  })();

  const mascotBuffer = await readFile(
    join(process.cwd(), "public", "favicon.png"),
  );
  const mascotSrc = `data:image/png;base64,${mascotBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          background:
            "linear-gradient(135deg, #064e3b 0%, #047857 45%, #0f766e 100%)",
          fontFamily: "system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Ambient blurred glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -160,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(16, 185, 129, 0.35)",
            filter: "blur(120px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -120,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "rgba(45, 212, 191, 0.25)",
            filter: "blur(130px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 120,
            right: 180,
            width: 260,
            height: 260,
            borderRadius: 9999,
            background: "rgba(255, 255, 255, 0.06)",
            filter: "blur(60px)",
            display: "flex",
          }}
        />

        {/* Subtle dotted grid texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.08) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
            display: "flex",
          }}
        />

        {/* Main content row */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "64px 72px",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 48,
          }}
        >
          {/* Left: copy */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 700,
              color: "white",
            }}
          >
            {/* Wordmark */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginBottom: 28,
              }}
            >
              <img
                src={mascotSrc}
                alt=""
                width={88}
                height={88}
                style={{
                  objectFit: "contain",
                  filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.35))",
                }}
              />
              <div
                style={{
                  fontSize: 76,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  color: "white",
                  lineHeight: 1,
                  textShadow: "0 2px 12px rgba(0,0,0,0.25)",
                  display: "flex",
                }}
              >
                OmniTrak
              </div>
            </div>

            {/* Eyebrow pill */}
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 16px",
                borderRadius: 9999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#d1fae5",
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 22,
              }}
            >
              Personal finance • simplified
            </div>

            {/* Headline */}
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                marginBottom: 18,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ display: "flex" }}>Track everything.</span>
              <span style={{ display: "flex", color: "#a7f3d0" }}>
                Stress less.
              </span>
            </div>

            {/* Subhead */}
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.88)",
                marginBottom: 28,
                display: "flex",
              }}
            >
              Expenses, planned spend, goals, and a built-in AI assistant — all
              in one beautifully simple app.
            </div>

            {/* Feature chips */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 28,
              }}
            >
              {["Built-in AI assistant", "Free to start", "No bank linking", "Works on any device"].map(
                (label) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: 9999,
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      fontSize: 20,
                      color: "white",
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 9999,
                        background: "#34d399",
                        display: "flex",
                      }}
                    />
                    {label}
                  </div>
                ),
              )}
            </div>

            {/* CTA */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 28px",
                  borderRadius: 14,
                  background: "white",
                  color: "#047857",
                  fontSize: 24,
                  fontWeight: 700,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                }}
              >
                Try it free →
              </div>
              {host && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 500,
                  }}
                >
                  {host}
                </div>
              )}
            </div>
          </div>

          {/* Right: stylized credit card mock (mirrors landing hero) */}
          <div
            style={{
              position: "relative",
              display: "flex",
              width: 380,
              height: 240,
              flexShrink: 0,
              transform: "rotate(6deg)",
            }}
          >
            {/* Back card (depth) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "translate(18px, 22px) rotate(-10deg)",
                borderRadius: 22,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
              }}
            />
            {/* Front card */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: 22,
                padding: 26,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background:
                  "linear-gradient(135deg, #059669 0%, #047857 55%, #0f3d3a 100%)",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow:
                  "0 30px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                color: "white",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -40,
                  right: -40,
                  width: 160,
                  height: 160,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: "0.22em",
                      color: "rgba(255,255,255,0.75)",
                      textTransform: "uppercase",
                      display: "flex",
                    }}
                  >
                    OmniTrak
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      display: "flex",
                    }}
                  >
                    Budget & Goals
                  </div>
                </div>
                <div
                  style={{
                    width: 46,
                    height: 36,
                    borderRadius: 6,
                    background:
                      "linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)",
                    boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.2)",
                    display: "flex",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 22,
                  letterSpacing: "0.22em",
                  color: "rgba(255,255,255,0.95)",
                  display: "flex",
                }}
              >
                •••• •••• •••• 0428
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      display: "flex",
                    }}
                  >
                    Valid
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 16,
                      color: "white",
                      display: "flex",
                    }}
                  >
                    12/28
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      display: "flex",
                    }}
                  >
                    PHP
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "white",
                      display: "flex",
                    }}
                  >
                    Full clarity.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
