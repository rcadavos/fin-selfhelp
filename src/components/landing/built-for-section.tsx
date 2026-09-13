import { cn } from "@/lib/utils";

const audiences = [
  {
    title: "Households & couples",
    copy: "On Pro or Premium, share read-only views with a partner so you both see bills and lists — without juggling spreadsheets.",
  },
  {
    title: "Busy professionals",
    copy: "Glance at paid vs unpaid, due dates, and totals in one place between commutes and errands.",
  },
  {
    title: "Anyone leveling up money habits",
    copy: "Start free, add what you owe, and grow into calculators and Pro reminders when you are ready.",
  },
];

export function BuiltForSection({ className }: { className?: string }) {
  return (
    <section
      id="built-for"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
            Built for real routines
          </h2>
          <p className="mt-3 max-w-[38ch] text-muted-foreground">
            For anyone who wants to track bills, lists, and routines in daily life —
            without turning finance into a second job.
          </p>
        </div>
        <ul className="border-t border-border lg:col-span-7">
          {audiences.map(({ title, copy }) => (
            <li key={title} className="border-b border-border py-5">
              <h3 className="text-[17px] font-bold text-foreground">{title}</h3>
              <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                {copy}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
