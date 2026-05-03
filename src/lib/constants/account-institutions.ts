export const PHILIPPINE_BANKS = [
  "BDO Unibank",
  "Bank of the Philippine Islands (BPI)",
  "Metrobank",
  "Philippine National Bank (PNB)",
  "Security Bank",
  "Landbank of the Philippines",
  "Development Bank of the Philippines (DBP)",
  "UnionBank",
  "China Banking Corporation (Chinabank)",
  "RCBC",
  "EastWest Bank",
  "Maybank Philippines",
  "Asia United Bank (AUB)",
  "Philippine Savings Bank (PSBank)",
  "Robinsons Bank",
  "CTBC Bank Philippines",
  "ING Bank Philippines",
  "HSBC Philippines",
  "Citibank Philippines",
  "Standard Chartered Philippines",
  "BDO Network Bank",
  "Overseas Filipino Bank (OFBank)",
  "GCash",
  "Maya (PayMaya)",
  "SeaBank Philippines",
  "CIMB Bank Philippines",
  "Tonik Digital Bank",
  "GoTyme Bank",
  "OwnBank",
  "Maribank",
  "Other",
] as const;

type InstitutionBadge = {
  text: string;
  bg: string;
  fg: string;
};

const DEFAULT_BADGE: InstitutionBadge = {
  text: "BA",
  bg: "#475569",
  fg: "#ffffff",
};

const INSTITUTION_BADGES: Array<{ match: RegExp; badge: InstitutionBadge }> = [
  { match: /cash/i, badge: { text: "CA", bg: "#15803d", fg: "#ffffff" } },
  { match: /borrowed/i, badge: { text: "BO", bg: "#52525b", fg: "#ffffff" } },
  { match: /bdo/i, badge: { text: "BD", bg: "#1d4ed8", fg: "#ffffff" } },
  { match: /\bbpi\b|philippine islands/i, badge: { text: "BP", bg: "#b91c1c", fg: "#ffffff" } },
  { match: /metrobank/i, badge: { text: "MB", bg: "#dc2626", fg: "#ffffff" } },
  { match: /\bpnb\b|philippine national/i, badge: { text: "PN", bg: "#7c2d12", fg: "#ffffff" } },
  { match: /security bank/i, badge: { text: "SB", bg: "#1d4ed8", fg: "#ffffff" } },
  { match: /landbank/i, badge: { text: "LB", bg: "#15803d", fg: "#ffffff" } },
  { match: /\bdbp\b|development bank/i, badge: { text: "DB", bg: "#0f766e", fg: "#ffffff" } },
  { match: /unionbank/i, badge: { text: "UB", bg: "#2563eb", fg: "#ffffff" } },
  { match: /chinabank/i, badge: { text: "CB", bg: "#166534", fg: "#ffffff" } },
  { match: /rcbc/i, badge: { text: "RC", bg: "#166534", fg: "#ffffff" } },
  { match: /eastwest/i, badge: { text: "EW", bg: "#7c2d12", fg: "#ffffff" } },
  { match: /maybank/i, badge: { text: "MY", bg: "#a16207", fg: "#ffffff" } },
  { match: /\baub\b|asia united/i, badge: { text: "AU", bg: "#4c1d95", fg: "#ffffff" } },
  { match: /psbank|philippine savings/i, badge: { text: "PS", bg: "#1e40af", fg: "#ffffff" } },
  { match: /robinsons bank/i, badge: { text: "RB", bg: "#1d4ed8", fg: "#ffffff" } },
  { match: /ctbc/i, badge: { text: "CT", bg: "#0f766e", fg: "#ffffff" } },
  { match: /\bing\b/, badge: { text: "IN", bg: "#ea580c", fg: "#ffffff" } },
  { match: /hsbc/i, badge: { text: "HS", bg: "#b91c1c", fg: "#ffffff" } },
  { match: /citibank|citi/i, badge: { text: "CI", bg: "#1d4ed8", fg: "#ffffff" } },
  { match: /standard chartered/i, badge: { text: "SC", bg: "#0f766e", fg: "#ffffff" } },
  { match: /ofbank|overseas filipino/i, badge: { text: "OF", bg: "#0f766e", fg: "#ffffff" } },
  { match: /gcash/i, badge: { text: "GC", bg: "#1d4ed8", fg: "#ffffff" } },
  { match: /maya|paymaya/i, badge: { text: "MY", bg: "#15803d", fg: "#ffffff" } },
  { match: /seabank/i, badge: { text: "SE", bg: "#f97316", fg: "#ffffff" } },
  { match: /cimb/i, badge: { text: "CM", bg: "#dc2626", fg: "#ffffff" } },
  { match: /tonik/i, badge: { text: "TN", bg: "#7c3aed", fg: "#ffffff" } },
  { match: /gotyme/i, badge: { text: "GT", bg: "#15803d", fg: "#ffffff" } },
  { match: /ownbank/i, badge: { text: "OW", bg: "#7c2d12", fg: "#ffffff" } },
  { match: /mari ?bank/i, badge: { text: "MR", bg: "#0f766e", fg: "#ffffff" } },
];

export function getInstitutionBadge(bankName: string): InstitutionBadge {
  const matched = INSTITUTION_BADGES.find(({ match }) => match.test(bankName));
  return matched?.badge ?? DEFAULT_BADGE;
}
