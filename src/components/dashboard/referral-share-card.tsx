"use client";

import { useEffect, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Facebook,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  Send,
  Share2,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/ui/copy-button";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { sendReferralInvites } from "@/actions/referrals";
import {
  REFERRAL_MAX_INVITE_EMAILS,
  buildReferralShareMessage,
} from "@/lib/constants/referral";

/** Opens in a new tab; `noopener` keeps the opener out of the share window. */
const EXTERNAL_LINK_PROPS = { target: "_blank", rel: "noopener noreferrer" } as const;

function buildShareTargets(link: string, message: string) {
  const encodedLink = encodeURIComponent(link);
  const encodedMessage = encodeURIComponent(message);
  return [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedMessage}`,
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
    },
    {
      key: "x",
      label: "X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(message)}`,
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent("Try OmniTrak with me")}&body=${encodedMessage}`,
    },
  ] as const;
}

export function ReferralShareCard({
  code,
  link,
  onInvitesSent,
}: {
  code: string;
  link: string;
  onInvitesSent?: () => void;
}) {
  const { showSuccess, showError } = useSnackbar();
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [emails, setEmails] = useState("");
  const [isSending, startSending] = useTransition();

  const message = buildReferralShareMessage(link);
  const shareTargets = buildShareTargets(link, message);

  // Feature-detected after mount so the server and first client render match.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleNativeShare() {
    try {
      await navigator.share({ title: "OmniTrak", text: message, url: link });
    } catch {
      // The user dismissed the sheet, or the browser refused — nothing to report.
    }
  }

  function handleSendInvites() {
    const list = emails
      .split(/[,\s;]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (list.length === 0) {
      showError("Add at least one email address.");
      return;
    }

    startSending(async () => {
      const res = await sendReferralInvites(list);
      if (res.error) {
        showError(res.error);
        return;
      }
      setEmails("");
      const skippedNote = res.skipped?.length ? ` • ${res.skipped.length} skipped` : "";
      showSuccess(`Invite sent to ${res.sent} ${res.sent === 1 ? "friend" : "friends"}${skippedNote}`);
      onInvitesSent?.();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your invite link</CardTitle>
        <CardDescription>
          Share this anywhere. Friends who sign up through it are credited to you automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Code ─────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Referral code
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2.5 font-mono text-lg font-bold tracking-[0.2em] text-foreground">
              {code}
            </code>
            <CopyButton
              value={code}
              label="Copy code"
              successMessage="Referral code copied"
              className="h-10"
            />
          </div>
        </div>

        {/* ── Link ─────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Share link
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-3 py-2.5 text-xs text-foreground sm:text-sm">
              {link}
            </code>
            <CopyButton
              value={link}
              label="Copy link"
              successMessage="Invite link copied"
              className="h-10"
            />
          </div>
        </div>

        {/* ── One-tap share ────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Share via
          </Label>
          <div className="flex flex-wrap gap-2">
            {canNativeShare && (
              <Button type="button" size="sm" className="gap-1.5" onClick={handleNativeShare}>
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                Share
              </Button>
            )}
            {shareTargets.map(({ key, label, icon: Icon, href }) => (
              <Button key={key} variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={href} {...EXTERNAL_LINK_PROPS}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </a>
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowQr((v) => !v)}
              aria-expanded={showQr}
            >
              <QrCode className="h-3.5 w-3.5" aria-hidden />
              {showQr ? "Hide QR" : "QR code"}
            </Button>
          </div>

          {showQr && (
            <div className="mt-3 flex flex-col items-center gap-2 rounded-md border border-border bg-card p-4">
              {/* White surround doubles as the QR quiet zone, so marginSize stays 0. */}
              <div className="rounded-md bg-white p-4">
                <QRCodeSVG
                  value={link}
                  size={160}
                  level="M"
                  marginSize={0}
                  title="OmniTrak referral invite link"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Point a camera at this to open your invite link
              </p>
            </div>
          )}
        </div>

        {/* ── Email invites ────────────────────────────────────────────────── */}
        <div className="space-y-2 border-t border-border pt-5">
          <Label htmlFor="referral-emails" className="text-xs uppercase tracking-wide text-muted-foreground">
            Or invite by email
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="referral-emails"
              type="text"
              inputMode="email"
              autoComplete="off"
              placeholder="friend@email.com, another@email.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              disabled={isSending}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              onClick={handleSendInvites}
              disabled={isSending || emails.trim().length === 0}
              className="h-10 shrink-0 gap-1.5"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Mail className="h-3.5 w-3.5" aria-hidden />
              )}
              {isSending ? "Sending…" : "Send invites"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Separate addresses with commas • up to {REFERRAL_MAX_INVITE_EMAILS} at a time
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
