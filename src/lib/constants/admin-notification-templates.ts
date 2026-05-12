export type AdminNotificationTemplate = {
  id: string;
  name: string;
  description: string;
  subject: string;
  inAppBody: string;
  emailHtml: string;
};

export const ADMIN_NOTIFICATION_TEMPLATES: AdminNotificationTemplate[] = [
  {
    id: "track-finances-reminder",
    name: "Track your finances",
    description: "Friendly weekly nudge to log expenses, check goals, and review bills.",
    subject: "A quick nudge to track your finances this week 💸",
    inAppBody:
      "Quick reminder — log this week's expenses, peek at your goals, and check upcoming bills in OmniTrak.",
    emailHtml: `<p style="margin:0 0 12px;">Hi there 👋</p>
<p style="margin:0 0 12px;">It's a great time to check in on your money. A few minutes today can save you a lot of stress later — and small habits really do add up.</p>

<h2 style="margin:20px 0 10px;font-size:18px;font-weight:700;color:#0f172a;">Here's a quick 3-step check-in</h2>
<ol style="margin:0 0 16px;padding-left:20px;line-height:1.7;">
  <li><strong>Log this week's expenses.</strong> Don't let receipts pile up — a few entries now beats an hour of catch-up later.</li>
  <li><strong>Peek at your goals.</strong> Are you on track? Adjust the target or add a contribution if life has shifted.</li>
  <li><strong>Review upcoming bills.</strong> Mark anything you've already paid and confirm due dates so nothing slips through.</li>
</ol>

<div style="padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:18px 0;">
  <p style="margin:0;font-size:13px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;">Tip of the week</p>
  <p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:#0f172a;">Set aside <strong>5 minutes every Sunday</strong> for a money check-in. It's the easiest habit to build — and the one that compounds the fastest.</p>
</div>

<p style="margin:0 0 12px;">You don't need to track perfectly. You just need to track <em>consistently</em>. We're rooting for you.</p>

<p style="margin:16px 0 0;">— The OmniTrak Team</p>`,
  },
  {
    id: "month-end-review",
    name: "Month-end review",
    description: "End-of-month prompt to review spending, savings, and goal progress.",
    subject: "Your month-end check-in is ready 📊",
    inAppBody:
      "The month is wrapping up — take 5 minutes to review your spending, savings, and goal progress in OmniTrak.",
    emailHtml: `<p style="margin:0 0 12px;">Hi there 👋</p>
<p style="margin:0 0 12px;">Another month, another chance to see how your money moved. A quick review now sets you up for a stronger next month.</p>

<h2 style="margin:20px 0 10px;font-size:18px;font-weight:700;color:#0f172a;">What to review</h2>
<ul style="margin:0 0 16px;padding-left:20px;line-height:1.7;">
  <li><strong>Top spending categories</strong> — anything surprising?</li>
  <li><strong>Savings progress</strong> — did you hit the target you set?</li>
  <li><strong>Goal contributions</strong> — bump a goal that's been quiet.</li>
  <li><strong>Upcoming bills</strong> — anything to plan for next month?</li>
</ul>

<p style="margin:0 0 12px;">Open your dashboard for a full breakdown.</p>
<p style="margin:16px 0 0;">— The OmniTrak Team</p>`,
  },
  {
    id: "bills-overdue",
    name: "Bills check-in",
    description: "Reminder to look at upcoming or overdue bills.",
    subject: "Don't forget — check your bills board 🔔",
    inAppBody:
      "Quick check on your bills board — any due soon? Mark paid ones off so you don't miss anything.",
    emailHtml: `<p style="margin:0 0 12px;">Hi there 👋</p>
<p style="margin:0 0 12px;">A friendly nudge to peek at your bills board in OmniTrak. Even a 30-second check can save a late fee.</p>

<ul style="margin:0 0 16px;padding-left:20px;line-height:1.7;">
  <li>Mark off anything you've already paid.</li>
  <li>Update due dates if a billing cycle shifted.</li>
  <li>Add any new bills you haven't tracked yet.</li>
</ul>

<p style="margin:0 0 12px;">Stay on top of it — your future self will thank you.</p>
<p style="margin:16px 0 0;">— The OmniTrak Team</p>`,
  },
];
