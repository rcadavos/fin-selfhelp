export type ParsedReceipt = {
  amount?: number;
  date?: string;
  merchant?: string;
};

const TOTAL_KEYWORDS = [
  "total amount",
  "grand total",
  "total due",
  "amount due",
  "balance due",
  "total",
  "amount",
];

const SKIP_LINE_KEYWORDS = [
  "subtotal",
  "vat",
  "tax",
  "change",
  "cash",
  "tender",
  "tendered",
  "discount",
  "vatable",
  "vat-able",
  "vatable sales",
];

const AMOUNT_TOKEN = /(?:₱|php|p)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+\.[0-9]{2})/i;
const AMOUNT_TOKEN_ALL = /(?:₱|php|p)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+\.[0-9]{2})/gi;

function toAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function findAmount(lines: string[]): number | undefined {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (SKIP_LINE_KEYWORDS.some((k) => lower.includes(k) && !TOTAL_KEYWORDS.some((t) => lower.includes(t)))) {
      continue;
    }
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      const matches = [...line.matchAll(AMOUNT_TOKEN_ALL)];
      if (matches.length > 0) {
        const last = matches[matches.length - 1];
        const amt = toAmount(last[1]);
        if (amt !== undefined) return amt;
      }
    }
  }

  let max = 0;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (SKIP_LINE_KEYWORDS.some((k) => lower.includes(k))) continue;
    const matches = [...line.matchAll(AMOUNT_TOKEN_ALL)];
    for (const m of matches) {
      const amt = toAmount(m[1]);
      if (amt !== undefined && amt > max) max = amt;
    }
  }
  return max > 0 ? max : undefined;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isPlausibleYear(y: number): boolean {
  const current = new Date().getFullYear();
  return y >= 2000 && y <= current + 1;
}

function toIsoDate(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31 || !isPlausibleYear(y)) return undefined;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function findDate(text: string): string | undefined {
  const numericRe = /\b(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})\b/g;
  let match: RegExpExecArray | null;
  while ((match = numericRe.exec(text)) !== null) {
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    const c = parseInt(match[3], 10);
    let y: number | undefined;
    let m: number | undefined;
    let d: number | undefined;
    if (match[1].length === 4) {
      y = a; m = b; d = c;
    } else if (match[3].length === 4) {
      y = c;
      if (a > 12 && b <= 12) { d = a; m = b; }
      else if (b > 12 && a <= 12) { m = a; d = b; }
      else { m = a; d = b; }
    } else {
      y = 2000 + c;
      if (a > 12 && b <= 12) { d = a; m = b; }
      else { m = a; d = b; }
    }
    if (y !== undefined && m !== undefined && d !== undefined) {
      const iso = toIsoDate(y, m, d);
      if (iso) return iso;
    }
  }

  const monthRe = /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)[\s\.\-]+(\d{1,2})[,\s\.\-]+(\d{2,4})\b/gi;
  while ((match = monthRe.exec(text)) !== null) {
    const m = MONTHS[match[1].toLowerCase()];
    const d = parseInt(match[2], 10);
    let y = parseInt(match[3], 10);
    if (y < 100) y += 2000;
    const iso = toIsoDate(y, m, d);
    if (iso) return iso;
  }

  const dayMonthRe = /\b(\d{1,2})[\s\.\-]+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)[,\s\.\-]+(\d{2,4})\b/gi;
  while ((match = dayMonthRe.exec(text)) !== null) {
    const d = parseInt(match[1], 10);
    const m = MONTHS[match[2].toLowerCase()];
    let y = parseInt(match[3], 10);
    if (y < 100) y += 2000;
    const iso = toIsoDate(y, m, d);
    if (iso) return iso;
  }

  return undefined;
}

function findMerchant(lines: string[]): string | undefined {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.length < 3 || line.length > 50) continue;
    if (AMOUNT_TOKEN.test(line)) continue;
    if (/^\d+$/.test(line.replace(/[\s\-\.]/g, ""))) continue;
    const letters = line.replace(/[^a-zA-Z]/g, "");
    if (letters.length < 3) continue;
    return line.replace(/\s+/g, " ");
  }
  return undefined;
}

export function parseReceipt(rawText: string): ParsedReceipt {
  if (!rawText || !rawText.trim()) return {};
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    amount: findAmount(lines),
    date: findDate(rawText),
    merchant: findMerchant(lines),
  };
}
