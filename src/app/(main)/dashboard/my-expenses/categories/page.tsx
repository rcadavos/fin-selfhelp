import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getExpenseCategories } from "@/actions/categories";
import { EXPENSE_CATEGORIES } from "@/types/database.types";
import { cn } from "@/lib/utils";

export default async function CategoriesPage() {
  const dbCategories = await getExpenseCategories();

  // Use DB as the source of truth. Fall back to static list only when DB returns nothing
  // (e.g. migration not yet applied). This ensures deletes and sort_order from admin are respected.
  const categories = dbCategories.length > 0
    ? dbCategories
    : EXPENSE_CATEGORIES.map((fallback) => ({
      id: fallback.id,
      label: fallback.label,
      bgClass: fallback.bgClass,
      sortOrder: 0,
      description: fallback.description ?? null,
      lists: fallback.lists ?? [],
    }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Back link */}
      <Link
        href="/dashboard/my-expenses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to My Expenses
      </Link>

      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Expense Categories</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {categories.length} categories available to organise your expenses and bills.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, index) => (
          <CategoryCard
            key={cat.id}
            index={index}
            label={cat.label}
            bgClass={cat.bgClass}
            description={cat.description}
            lists={cat.lists}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  index,
  label,
  bgClass,
  description,
  lists,
}: {
  index: number;
  label: string;
  bgClass: string;
  description: string | null;
  lists: string[];
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/60 p-5 shadow-sm transition-shadow hover:shadow-md",
        bgClass
      )}
    >
      {/* Header: number + category name */}
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-background shadow-sm">
          {index + 1}
        </span>
        <h2 className="text-base font-semibold leading-snug text-foreground">{label}</h2>
      </div>

      {/* Description */}
      {description && (
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}

      {/* Lists */}
      {lists.length > 0 && (
        <ul className="space-y-1.5">
          {lists.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-foreground/30" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
