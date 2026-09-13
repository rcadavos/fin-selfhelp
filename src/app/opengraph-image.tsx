import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getBaseUrl } from "@/lib/seo";

export const alt =
  "OmniTrak — Your all-in-one finance tracker, now with AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* ============================================================
   Passbook design tokens (light) — mirrors globals.css :root.
   One green ink, hairline rules, banking-grade mono numerals.
   ============================================================ */
const PAPER = "#F7F8F6"; // --background
const CARD = "#FCFDFB"; // --card surface
const INK = "#171D19"; // --foreground
const MUTED = "#5A6660"; // --muted-foreground
const GREEN = "#0B6E4F"; // --primary money green
const BORDER = "#E2E7E2"; // --border hairline
const HAIR_STRONG = "#C9D2CB"; // --hairline-strong
const AMBER = "#8A6116"; // --warning amber ink (Due)
const LEADER = "rgba(90,102,96,0.45)"; // dot-leader ink

/** Every glyph rendered in the image — sent to Google Fonts so it returns a
 *  subsetted TTF (Satori can't parse the woff2 you'd otherwise get). Includes
 *  both cases so `text-transform: uppercase` can't produce tofu. */
const GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;/-–—•₱→%&()'";

type FontSpec = { name: string; family: string; weight: 400 | 500 | 700 };

const FONT_SPECS: FontSpec[] = [
  { name: "Schibsted Grotesk", family: "Schibsted Grotesk", weight: 400 },
  { name: "Schibsted Grotesk", family: "Schibsted Grotesk", weight: 500 },
  { name: "Schibsted Grotesk", family: "Schibsted Grotesk", weight: 700 },
  { name: "Geist Mono", family: "Geist Mono", weight: 400 },
  { name: "Geist Mono", family: "Geist Mono", weight: 500 },
];

/** Fetch a single Google Font weight as a TTF ArrayBuffer, subset to GLYPHS.
 *  Returns null on any failure so the image still renders on next/og's
 *  bundled default font rather than failing the build. */
async function loadGoogleFont(
  spec: FontSpec,
): Promise<{
  name: string;
  data: ArrayBuffer;
  weight: FontSpec["weight"];
  style: "normal";
} | null> {
  try {
    const family = spec.family.replace(/ /g, "+");
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${spec.weight}&text=${encodeURIComponent(GLYPHS)}`;
    const cssRes = await fetch(url);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const src = css.match(
      /src:\s*url\(([^)]+)\)\s*format\(['"]?(?:opentype|truetype)['"]?\)/,
    )?.[1];
    if (!src) return null;
    const fontRes = await fetch(src);
    if (!fontRes.ok) return null;
    return {
      name: spec.name,
      data: await fontRes.arrayBuffer(),
      weight: spec.weight,
      style: "normal",
    };
  } catch {
    return null;
  }
}

const MONO = "Geist Mono";
const SANS = "Schibsted Grotesk";

/** A single passbook ledger row: label · dot-leader · amount [· stamp]. */
function LedgerRow({
  label,
  amount,
  stamp,
  paid = false,
  total = false,
  last = false,
}: {
  label: string;
  amount: string;
  stamp?: { text: string; variant: "paid" | "due" | "scheduled" };
  paid?: boolean;
  total?: boolean;
  last?: boolean;
}) {
  const stampStyle =
    stamp?.variant === "paid"
      ? { color: GREEN, border: `1px solid ${GREEN}` }
      : stamp?.variant === "due"
        ? { color: AMBER, border: `1px solid ${AMBER}` }
        : { color: MUTED, border: `1px solid ${HAIR_STRONG}` };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        padding: total ? "12px 0 0" : last ? "10px 0 0" : "10px 0",
        borderBottom: total || last ? "none" : `1px solid ${BORDER}`,
        borderTop: total ? `1px solid ${HAIR_STRONG}` : "none",
        marginTop: total ? 4 : 0,
      }}
    >
      <span
        style={{
          display: "flex",
          fontFamily: SANS,
          fontSize: total ? 17 : 15,
          fontWeight: total ? 700 : 500,
          lineHeight: 1,
          color: paid ? MUTED : INK,
          textDecoration: paid ? "line-through" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "flex",
          flex: 1,
          minWidth: 16,
          borderBottom: `2px dashed ${LEADER}`,
          margin: "0 8px 5px",
        }}
      />
      <span
        style={{
          display: "flex",
          fontFamily: MONO,
          fontSize: total ? 18 : 15,
          fontWeight: total ? 500 : 400,
          lineHeight: 1,
          color: paid ? MUTED : INK,
          textDecoration: paid ? "line-through" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {amount}
      </span>
      {stamp && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            marginLeft: 10,
            padding: "2px 7px",
            borderRadius: 4,
            fontFamily: MONO,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            ...stampStyle,
          }}
        >
          {stamp.text}
        </span>
      )}
    </div>
  );
}

export default async function OpenGraphImage() {
  const host = (() => {
    try {
      return new URL(getBaseUrl()).hostname;
    } catch {
      return "";
    }
  })();

  const [mascotBuffer, fontResults] = await Promise.all([
    readFile(join(process.cwd(), "public", "favicon.png")),
    Promise.all(FONT_SPECS.map(loadGoogleFont)),
  ]);
  const mascotSrc = `data:image/png;base64,${mascotBuffer.toString("base64")}`;
  const fonts = fontResults.filter(
    (f): f is NonNullable<typeof f> => f !== null,
  );

  const trustLine = "14-day Pro trial • Free to start • No bank linking";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          background: PAPER,
          fontFamily: SANS,
          overflow: "hidden",
        }}
      >
        {/* Ruled top edge — the statement's green header rule */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: GREEN,
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
            padding: "58px 62px 52px",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 46,
          }}
        >
          {/* Left: copy */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              maxWidth: 600,
            }}
          >
            {/* Wordmark */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mascotSrc}
                alt=""
                width={56}
                height={56}
                style={{ objectFit: "contain" }}
              />
              <div
                style={{
                  display: "flex",
                  fontFamily: SANS,
                  fontSize: 40,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: GREEN,
                  lineHeight: 1,
                }}
              >
                OmniTrak
              </div>
            </div>

            {/* Eyebrow */}
            <div
              style={{
                display: "flex",
                marginTop: 30,
                fontFamily: MONO,
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: GREEN,
              }}
            >
              Personal finance • Philippines
            </div>

            {/* Headline */}
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontFamily: SANS,
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                color: INK,
              }}
            >
              Your all-in-one finance tracker, now with AI
            </div>

            {/* Subhead */}
            <div
              style={{
                display: "flex",
                marginTop: 20,
                maxWidth: 520,
                fontFamily: SANS,
                fontSize: 21,
                fontWeight: 400,
                lineHeight: 1.4,
                color: MUTED,
              }}
            >
              Track expenses, bills, accounts, and goals in one simple
              app. Then ask the built-in assistant anything.
            </div>

            {/* CTA + host */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginTop: 32,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "13px 24px",
                  borderRadius: 8,
                  background: GREEN,
                  color: PAPER,
                  fontFamily: SANS,
                  fontSize: 19,
                  fontWeight: 700,
                }}
              >
                Start free 14-day trial
              </div>
              {host && (
                <div
                  style={{
                    display: "flex",
                    fontFamily: MONO,
                    fontSize: 17,
                    color: MUTED,
                  }}
                >
                  {host}
                </div>
              )}
            </div>

            {/* Trust line */}
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              {trustLine}
            </div>
          </div>

          {/* Right: the upcoming-bills ledger (mirrors the landing hero) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 452,
              flexShrink: 0,
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "24px 26px",
              boxShadow: "0 18px 40px rgba(23,29,25,0.10)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 12,
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <span
                style={{
                  display: "flex",
                  fontFamily: MONO,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                Upcoming bills
              </span>
              <span
                style={{
                  display: "flex",
                  fontFamily: MONO,
                  fontSize: 12,
                  color: MUTED,
                }}
              >
                JUL 2026
              </span>
            </div>

            <LedgerRow
              label="Meralco"
              amount="₱3,214.57"
              stamp={{ text: "Due Jul 15", variant: "due" }}
            />
            <LedgerRow
              label="Maynilad"
              amount="₱486.20"
              stamp={{ text: "Paid", variant: "paid" }}
              paid
            />
            <LedgerRow
              label="Globe Fiber"
              amount="₱1,699.00"
              stamp={{ text: "Due Jul 18", variant: "due" }}
            />
            <LedgerRow
              label="Netflix"
              amount="₱549.00"
              stamp={{ text: "Paid", variant: "paid" }}
              paid
            />
            <LedgerRow
              label="Pag-IBIG MP2"
              amount="₱1,000.00"
              stamp={{ text: "Scheduled", variant: "scheduled" }}
              last
            />
            <LedgerRow label="Still to pay" amount="₱4,913.57" total />

            {/* Footer: 6-month spend sparkline */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 16,
                paddingTop: 14,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <span
                style={{
                  display: "flex",
                  fontFamily: SANS,
                  fontSize: 13,
                  color: MUTED,
                }}
              >
                6-month spend
              </span>
              <svg width="84" height="24" viewBox="0 0 84 24" fill="none">
                <polyline
                  points="2,18 15,14 28,16 41,9 54,12 67,5 82,8"
                  stroke={GREEN}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="82" cy="8" r="2.8" fill={GREEN} />
              </svg>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length > 0 ? { fonts } : {}) },
  );
}
