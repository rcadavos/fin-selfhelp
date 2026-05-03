import { Home, Briefcase, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

const audiences = [
  {
    title: "Households & couples",
    copy: "On Pro or Premium, share read-only views with a partner so you both see planned expenses and lists — without juggling spreadsheets.",
    icon: Home,
  },
  {
    title: "Busy professionals",
    copy: "Glance at paid vs unpaid, due dates, and totals in one place between commutes and errands.",
    icon: Briefcase,
  },
  {
    title: "Anyone leveling up money habits",
    copy: "Start free, add what you owe, and grow into calculators and Pro reminders when you are ready.",
    icon: HeartHandshake,
  },
];

export function BuiltForSection({ className }: { className?: string }) {
  return (
    <section
      id="built-for"
      className={cn("px-4 py-16 sm:px-6 lg:px-8", className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Built for real routines</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            For anyone who wants to track planned expenses, lists, and routines in daily life—without turning finance into a second
            job.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-3">
          {audiences.map(({ title, copy, icon: Icon }) => (
            <li
              key={title}
              className="flex flex-col rounded-2xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
