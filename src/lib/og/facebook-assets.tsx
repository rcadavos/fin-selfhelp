import type { CSSProperties, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { getBaseUrl } from "@/lib/seo";
import {
  AMBER,
  BORDER,
  CARD,
  GREEN,
  INK,
  LEADER,
  MONO,
  MUTED,
  PAPER,
  PILL,
  SANS,
  TINT,
  loadBrandFonts,
  loadOttoFaceDataUrl,
} from "@/lib/og/brand";
import {
  FACEBOOK_COVER_PHONE_SAFE_RATIO,
  FACEBOOK_COVER_SIZE,
  FACEBOOK_PROFILE_SIZE,
  type FacebookCoverVariant,
  type FacebookProfileVariant,
} from "@/lib/constants/social";
import { PRODUCT_NAME } from "@/lib/constants/prospect-chat";
import { MASCOT_NAME } from "@/lib/constants/mascot";
import { TRIAL_DURATION_DAYS } from "@/lib/constants/trial";

/**
 * The Facebook cover and profile picture, drawn from the brand tokens and Otto.
 * Served to admins by /api/admin/brand/[asset]. Server-only: it reads files from `public/`.
 */

const { width: W, height: H } = FACEBOOK_COVER_SIZE;
/** Phones show only the middle of the cover; everything that matters sits inside it. */
const SAFE_W = Math.floor(W * FACEBOOK_COVER_PHONE_SAFE_RATIO);
const TRUST_LINE = `${TRIAL_DURATION_DAYS}-day Pro trial • Free to start • No bank linking`;

function hostName(): string {
  try {
    return new URL(getBaseUrl()).hostname;
  } catch {
    return "";
  }
}

/** A soft tinted disc with a dashed ledger ring, for the sides of a cover. */
function Disc({ size, style }: { size: number; style: CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 999,
        background: TINT,
        border: `2px solid ${BORDER}`,
        ...style,
      }}
    >
      <div style={{ display: "flex", width: size * 0.72, height: size * 0.72, borderRadius: 999, border: `2px dashed ${LEADER}`, opacity: 0.5 }} />
    </div>
  );
}

/** Paper background, discs at the sides and the green band along the bottom, with `children` centred in the phone-safe area. */
function CoverFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        background: PAPER,
        fontFamily: SANS,
        color: INK,
      }}
    >
      {/* Decoration only, so it may run into the parts phones crop off. */}
      <Disc size={520} style={{ left: -200, top: -230 }} />
      <Disc size={600} style={{ right: -230, bottom: -300 }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 18, background: GREEN, display: "flex" }} />
      <div
        style={{
          width: SAFE_W,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "40px 48px 58px",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Headline({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", maxWidth: 560 }}>
      <span style={{ display: "flex", fontFamily: MONO, fontSize: 24, fontWeight: 500, color: GREEN, letterSpacing: 1 }}>
        {eyebrow}
      </span>
      <span style={{ display: "flex", marginTop: 14, fontSize: 62, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1.5 }}>
        {title}
      </span>
      <span style={{ display: "flex", marginTop: 18, fontSize: 27, lineHeight: 1.35, color: MUTED }}>{sub}</span>
    </div>
  );
}

function Panel({ children, width = 420 }: { children: ReactNode; width?: number }) {
  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        background: CARD,
        border: `2px solid ${BORDER}`,
        borderRadius: 22,
        boxShadow: "0 18px 40px rgba(23,29,25,0.08)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function BillRow({ name, amount, pill, label }: { name: string; amount: string; pill: keyof typeof PILL; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "16px 22px", borderTop: `2px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", fontSize: 24, fontWeight: 500 }}>{name}</span>
        <span style={{ display: "flex", fontFamily: MONO, fontSize: 24, fontWeight: 500 }}>{amount}</span>
      </div>
      <span
        style={{
          display: "flex",
          alignSelf: "flex-start",
          marginTop: 8,
          padding: "4px 12px",
          borderRadius: 999,
          fontSize: 18,
          fontWeight: 500,
          color: PILL[pill].color,
          background: PILL[pill].background,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function SplitRow({ label, share, amount }: { label: string; share: number; amount: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "14px 22px", borderTop: `2px solid ${BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", fontSize: 22, fontWeight: 500 }}>{label}</span>
        <span style={{ display: "flex", fontFamily: MONO, fontSize: 22 }}>{amount}</span>
      </div>
      <div style={{ display: "flex", marginTop: 10, height: 12, borderRadius: 999, background: TINT, border: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", width: `${share}%`, height: "100%", borderRadius: 999, background: GREEN }} />
      </div>
    </div>
  );
}

function Bubble({ from, children }: { from: "you" | "otto"; children: ReactNode }) {
  const mine = from === "you";
  return (
    <div
      style={{
        display: "flex",
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: 380,
        marginTop: 14,
        padding: "14px 18px",
        borderRadius: 20,
        fontSize: 22,
        lineHeight: 1.35,
        flexDirection: "column",
        color: mine ? "#FFFFFF" : INK,
        background: mine ? GREEN : CARD,
        border: mine ? "none" : `2px solid ${BORDER}`,
      }}
    >
      {children}
    </div>
  );
}

/** Peso amounts get their own line in mono: the sans font has no ₱, and Satori mis-measures a mixed line. */
function Amount({ children }: { children: string }) {
  return (
    <span style={{ display: "flex", margin: "4px 0", fontFamily: MONO, fontSize: 30, fontWeight: 500, color: GREEN }}>
      {children}
    </span>
  );
}

function cover(variant: FacebookCoverVariant, otto: string, host: string) {
  switch (variant) {
    case "bills":
      return (
        <CoverFrame>
          <Headline eyebrow="BILLS • REMINDERS" title="Never miss a bill again." sub="A reminder before every due date." />
          <div style={{ display: "flex", position: "relative" }}>
            <Panel>
              <div style={{ display: "flex", padding: "18px 22px", fontSize: 22, fontWeight: 700 }}>Bills to pay</div>
              <BillRow name="Credit card" amount="₱8,420.00" pill="overdue" label="Overdue" />
              <BillRow name="Electricity" amount="₱2,846.50" pill="due" label="Due tomorrow" />
              <BillRow name="Internet" amount="₱1,699.00" pill="scheduled" label="Auto-debit" />
            </Panel>
            {/* eslint-disable-next-line @next/next/no-img-element -- drawn by Satori, where next/image does not exist */}
            <img alt="" src={otto} width={120} height={120} style={{ position: "absolute", right: -46, top: -62 }} />
          </div>
        </CoverFrame>
      );
    case "otto":
      return (
        <CoverFrame>
          <Headline eyebrow={`ASK ${MASCOT_NAME.toUpperCase()} • AI`} title={`Ask ${MASCOT_NAME} about your money.`} sub="Answers from your own budget and bills." />
          <div style={{ display: "flex", flexDirection: "column", width: 480 }}>
            <Bubble from="you">Can I afford a new phone this month?</Bubble>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- drawn by Satori, where next/image does not exist */}
              <img alt="" src={otto} width={92} height={92} style={{ marginRight: 10 }} />
              <Bubble from="otto">
                <span style={{ display: "flex" }}>After this month&apos;s bills you have</span>
                <Amount>₱11,450</Amount>
                <span style={{ display: "flex" }}>left. Wait for the 30th.</span>
              </Bubble>
            </div>
          </div>
        </CoverFrame>
      );
    case "season":
      return (
        <CoverFrame>
          <Headline eyebrow="13TH MONTH • HOLIDAYS" title="Give your 13th month a plan." sub="Bills first, savings next, Noche Buena with a limit." />
          <Panel width={430}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 22px", fontSize: 22, fontWeight: 700 }}>
              <span style={{ display: "flex" }}>13th month split</span>
              <span style={{ display: "flex", fontFamily: MONO, fontWeight: 500, color: AMBER }}>₱32,000</span>
            </div>
            <SplitRow label="Bills & debts" share={50} amount="₱16,000" />
            <SplitRow label="Savings goal" share={30} amount="₱9,600" />
            <SplitRow label="Gifts & Noche Buena" share={20} amount="₱6,400" />
          </Panel>
        </CoverFrame>
      );
    case "brand":
    default:
      return (
        <CoverFrame>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- drawn by Satori, where next/image does not exist */}
            <img alt="" src={otto} width={300} height={300} />
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 34 }}>
              <span style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
                {PRODUCT_NAME}
              </span>
              <span style={{ display: "flex", marginTop: 16, fontSize: 34, color: MUTED }}>
                Bills, budget and reminders in one place.
              </span>
              <span style={{ display: "flex", marginTop: 26, fontFamily: MONO, fontSize: 22, fontWeight: 500, color: GREEN }}>
                {TRUST_LINE}
              </span>
              {host ? (
                <span style={{ display: "flex", marginTop: 10, fontFamily: MONO, fontSize: 22, color: MUTED }}>{host}</span>
              ) : null}
            </div>
          </div>
        </CoverFrame>
      );
  }
}

function profile(variant: FacebookProfileVariant, otto: string) {
  const S = FACEBOOK_PROFILE_SIZE;
  const onGreen = variant === "green";
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: onGreen ? GREEN : PAPER }}>
      {/* Facebook crops to a circle; Otto stays well inside it. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: Math.round(S * 0.8),
          height: Math.round(S * 0.8),
          borderRadius: 999,
          background: onGreen ? PAPER : CARD,
          border: onGreen ? "none" : `6px solid ${BORDER}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn by Satori, where next/image does not exist */}
        <img alt="" src={otto} width={Math.round(S * 0.64)} height={Math.round(S * 0.64)} style={{ marginTop: -Math.round(S * 0.02) }} />
      </div>
    </div>
  );
}

/** The cover for `variant`, as a PNG response. */
export async function renderFacebookCover(variant: FacebookCoverVariant, init?: ResponseInit): Promise<ImageResponse> {
  const [otto, fonts] = await Promise.all([loadOttoFaceDataUrl(), loadBrandFonts()]);
  return new ImageResponse(cover(variant, otto, hostName()), { width: W, height: H, fonts, headers: init?.headers });
}

/** The profile picture for `variant`, as a PNG response. */
export async function renderFacebookProfile(variant: FacebookProfileVariant, init?: ResponseInit): Promise<ImageResponse> {
  const [otto, fonts] = await Promise.all([loadOttoFaceDataUrl(), loadBrandFonts()]);
  return new ImageResponse(profile(variant, otto), {
    width: FACEBOOK_PROFILE_SIZE,
    height: FACEBOOK_PROFILE_SIZE,
    fonts,
    headers: init?.headers,
  });
}

export function pickVariant<T extends string>(raw: string | null, allowed: readonly { id: T }[]): T {
  return allowed.find((v) => v.id === raw)?.id ?? allowed[0].id;
}
