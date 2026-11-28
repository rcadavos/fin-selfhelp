import {
  Car,
  CircleEllipsis,
  CreditCard,
  Gamepad2,
  GraduationCap,
  Hammer,
  HandCoins,
  HeartPulse,
  House,
  PiggyBank,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** The icon on each expense row, keyed by the built-in category ids in `EXPENSE_CATEGORIES`. */
export const EXPENSE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  grocery: ShoppingCart,
  transport: Car,
  utilities: Zap,
  insurance: ShieldCheck,
  loans: HandCoins,
  savings: PiggyBank,
  rent: House,
  food_dining: UtensilsCrossed,
  health: HeartPulse,
  education: GraduationCap,
  personal: Sparkles,
  credit_card: CreditCard,
  gaming: Gamepad2,
  home_maintenance: Hammer,
  subscription: Repeat,
  other: CircleEllipsis,
};

/** For a custom category, or an entry with none. */
export const FALLBACK_EXPENSE_CATEGORY_ICON: LucideIcon = Tag;
