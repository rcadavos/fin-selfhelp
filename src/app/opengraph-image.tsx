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
const RED = "#B3372F"; // --destructive (Overdue)
const BLUE = "#1F62B0"; // --info (Auto-debit)
const TINT = "#F3F7F4"; // --primary at 4% on the card: the dashboard's second figure
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

/** Large-print status pill, as on the dashboard: plain words on a soft tint. */
const PILL = {
  overdue: { color: RED, background: "#FBEDEB" },
  due: { color: AMBER, background: "#FBF3E2" },
  scheduled: { color: BLUE, background: "#E8F0FA" },
} as const;

/** One of the dashboard's two big figures ("Your money at a glance"). */
function GlanceFigure({
  label,
  amount,
  tinted = false,
}: {
  label: string;
  amount: string;
  tinted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "20px 22px",
        background: tinted ? TINT : CARD,
        borderLeft: tinted ? `1px solid ${BORDER}` : "none",
      }}
    >
      <span
        style={{
          display: "flex",
          fontFamily: SANS,
          fontSize: 15,
          fontWeight: 500,
          color: MUTED,
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "flex",
          marginTop: 6,
          fontFamily: MONO,
          fontSize: 27,
          fontWeight: 500,
          lineHeight: 1,
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {amount}
      </span>
    </div>
  );
}

/** A "Bills to pay" row: name · dot-leader · amount, then its pill and action. */
function BillRow({
  name,
  amount,
  pill,
  pillText,
  action,
}: {
  name: string;
  amount: string;
  pill: keyof typeof PILL;
  pillText: string;
  /** Omitted for auto-debit bills, which pay themselves. */
  action?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "11px 0",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <span
          style={{
            display: "flex",
            fontFamily: SANS,
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1,
            color: INK,
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </span>
        <span
          style={{
            display: "flex",
            flex: 1,
            minWidth: 16,
            borderBottom: `2px dashed ${LEADER}`,
            margin: "0 8px 4px",
          }}
        />
        <span
          style={{
            display: "flex",
            fontFamily: MONO,
            fontSize: 17,
            fontWeight: 500,
            lineHeight: 1,
            color: INK,
            whiteSpace: "nowrap",
          }}
        >
          {amount}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <span
          style={{
            display: "flex",
            padding: "4px 11px",
            borderRadius: 999,
            fontFamily: SANS,
            fontSize: 14,
            fontWeight: 700,
            ...PILL[pill],
          }}
        >
          {pillText}
        </span>
        {action ? (
          <span
            style={{
              display: "flex",
              padding: "5px 12px",
              borderRadius: 7,
              border: `2px solid ${GREEN}`,
              fontFamily: SANS,
              fontSize: 14,
              fontWeight: 700,
              color: GREEN,
            }}
          >
            {action}
          </span>
        ) : (
          <span style={{ display: "flex", fontFamily: SANS, fontSize: 14, color: MUTED }}>
            Pays itself
          </span>
        )}
      </div>
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
    readFile(join(process.cwd(), "public", "icons", "otto-512.png")),
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

          {/* Right: the dashboard — money at a glance and Bills to pay (mirrors /dashboard) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 452,
              flexShrink: 0,
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 18px 40px rgba(23,29,25,0.10)",
            }}
          >
            {/* Your money at a glance */}
            <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
              <GlanceFigure label="In your accounts" amount="₱48,250.00" />
              <GlanceFigure label="Bills left to pay" amount="₱4,829.00" tinted />
            </div>

            {/* Paid progress */}
            <div style={{ display: "flex", flexDirection: "column", padding: "14px 22px 4px" }}>
              <div
                style={{
                  display: "flex",
                  height: 9,
                  borderRadius: 999,
                  background: HAIR_STRONG,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "62.5%",
                    height: "100%",
                    borderRadius: 999,
                    background: GREEN,
                  }}
                />
              </div>
              <span
                style={{
                  display: "flex",
                  marginTop: 7,
                  fontFamily: SANS,
                  fontSize: 14,
                  color: MUTED,
                }}
              >
                5 of 8 bills paid • 3 still to pay
              </span>
            </div>

            {/* Bills to pay */}
            <div style={{ display: "flex", flexDirection: "column", padding: "6px 22px 18px" }}>
              <span
                style={{
                  display: "flex",
                  padding: "8px 0 4px",
                  fontFamily: SANS,
                  fontSize: 19,
                  fontWeight: 700,
                  color: INK,
                }}
              >
                Bills to pay
              </span>
              <BillRow
                name="Maynilad"
                amount="₱680.00"
                pill="overdue"
                pillText="Overdue"
                action="Mark as paid"
              />
              <BillRow
                name="Meralco"
                amount="₱2,450.00"
                pill="due"
                pillText="Due tomorrow"
                action="Mark as paid"
              />
              <BillRow name="PLDT Fibr" amount="₱1,699.00" pill="scheduled" pillText="Auto-debit" />
              <div style={{ display: "flex", alignItems: "flex-end", marginTop: 12 }}>
                <span
                  style={{
                    display: "flex",
                    fontFamily: SANS,
                    fontSize: 17,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: INK,
                  }}
                >
                  Still to pay
                </span>
                <span
                  style={{
                    display: "flex",
                    flex: 1,
                    minWidth: 16,
                    borderBottom: `2px dashed ${LEADER}`,
                    margin: "0 8px 4px",
                  }}
                />
                <span
                  style={{
                    display: "flex",
                    fontFamily: MONO,
                    fontSize: 18,
                    fontWeight: 500,
                    lineHeight: 1,
                    color: INK,
                  }}
                >
                  ₱4,829.00
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length > 0 ? { fonts } : {}) },
  );
}
