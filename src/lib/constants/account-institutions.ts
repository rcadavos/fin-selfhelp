export const BANK_COLOR_MAP: Record<string, string> = {
  "Cash":                                      "#0ea5e9",
  "BDO Unibank":                               "#04369B",
  "Bank of the Philippine Islands (BPI)":      "#C23133",
  "Metrobank":                                 "#005faa",
  "Philippine National Bank (PNB)":            "#072269",
  "Security Bank":                             "#9FD067",
  "Landbank of the Philippines":               "#74BC44",
  "Development Bank of the Philippines (DBP)": "#0152AA",
  "UnionBank":                                 "#FF8000",
  "China Banking Corporation (Chinabank)":     "#FE0000",
  "RCBC":                                      "#4C92CD",
  "EastWest Bank":                             "#D5E04D",
  "Maybank Philippines":                       "#FEC32F",
  "Asia United Bank (AUB)":                    "#BF161D",
  "Philippine Savings Bank (PSBank)":          "#0855A5",
  "Robinsons Bank":                            "#75C044",
  "CTBC Bank Philippines":                     "#00A651",
  "ING Bank Philippines":                      "#FF6201",
  "HSBC Philippines":                          "#DA0011",
  "Citibank Philippines":                      "#255BE3",
  "Standard Chartered Philippines":            "#020B43",
  "BDO Network Bank":                          "#043673",
  "Overseas Filipino Bank (OFBank)":           "#0038A8",
  "GCash":                                     "#1972F9",
  "Maya (PayMaya)":                            "#75EEA5",
  "CIMB Bank Philippines":                     "#780000",
  "Tonik Digital Bank":                        "#785AFF",
  "GoTyme Bank":                               "#01F3FA",
  "OwnBank":                                   "#65E294",
  "Maribank":                                  "#EA5F01",
  "Coins.ph":                                  "#1E68D5",
  "Binance":                                   "#F0B90A",
  "OKX":                                       "#000000",
  "Metamask":                                  "#FFA680",
};

export function getBankColor(bankName: string): string | null {
  return BANK_COLOR_MAP[bankName] ?? null;
}

const BANK_LOGO_MAP: Record<string, string> = {
  "BDO Unibank": "bdo",
  "Bank of the Philippine Islands (BPI)": "bpi",
  "Metrobank": "metrobank",
  "Philippine National Bank (PNB)": "pnb",
  "Security Bank": "security",
  "Landbank of the Philippines": "landbank",
  "Development Bank of the Philippines (DBP)": "dbp",
  "UnionBank": "unionbank",
  "China Banking Corporation (Chinabank)": "chinabank",
  "RCBC": "rcbc",
  "EastWest Bank": "eastwest",
  "Maybank Philippines": "maybank",
  "Asia United Bank (AUB)": "aub",
  "Philippine Savings Bank (PSBank)": "psbank",
  "Robinsons Bank": "robinsons",
  "CTBC Bank Philippines": "ctbc",
  "ING Bank Philippines": "ing",
  "HSBC Philippines": "hsbc",
  "Citibank Philippines": "citi",
  "Standard Chartered Philippines": "standard-chartered",
  "BDO Network Bank": "bdo",
  "Overseas Filipino Bank (OFBank)": "ofbank",
  "GCash": "gcash",
  "Maya (PayMaya)": "maya",
  "CIMB Bank Philippines": "cimb",
  "Tonik Digital Bank": "tonik",
  "GoTyme Bank": "gotyme",
  "OwnBank": "ownbank",
  "Maribank": "maribank",
  "Coins.ph": "coins",
  "Binance":  "binance",
  "OKX":      "okx",
  "Metamask": "metamask",
};

const BANK_LOGO_MAP_LOWER = Object.fromEntries(
  Object.entries(BANK_LOGO_MAP).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, ""), v]),
);

export function getBankLogoSlug(bankName: string): string | null {
  return (
    BANK_LOGO_MAP[bankName] ??
    BANK_LOGO_MAP_LOWER[bankName.toLowerCase().replace(/\s+/g, "")] ??
    null
  );
}

export const BANK_GROUPS: Array<{ label: string; banks: string[] }> = [
  {
    label: "Banks & E-Wallets",
    banks: [
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
      "CIMB Bank Philippines",
      "Tonik Digital Bank",
      "GoTyme Bank",
      "OwnBank",
      "Maribank",
    ],
  },
  {
    label: "Crypto",
    banks: ["Coins.ph", "Binance", "OKX", "Metamask"],
  },
];

export const PHILIPPINE_BANKS = [
  ...BANK_GROUPS.flatMap((g) => g.banks),
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
  { match: /coins\.ph|coins/i, badge: { text: "CO", bg: "#1E68D5", fg: "#ffffff" } },
  { match: /binance/i, badge: { text: "BN", bg: "#F0B90A", fg: "#000000" } },
  { match: /\bokx\b/i, badge: { text: "OK", bg: "#000000", fg: "#ffffff" } },
  { match: /metamask/i, badge: { text: "MM", bg: "#FFA680", fg: "#ffffff" } },
];

export function getInstitutionBadge(bankName: string): InstitutionBadge {
  const matched = INSTITUTION_BADGES.find(({ match }) => match.test(bankName));
  return matched?.badge ?? DEFAULT_BADGE;
}
