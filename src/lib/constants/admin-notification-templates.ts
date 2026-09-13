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
  {
    id: "redesign-announcement",
    name: "Redesign + Pro perks",
    description: "Announces the redesign and the two ways to get Pro free: birth month and referrals.",
    subject: "OmniTrak has a new look — and two ways to get Pro free",
    inAppBody:
      "OmniTrak has been redesigned. Bills now group by what needs you, and Expenses shows whether a month is heavy. Plus two ways to get Pro free: your birth month, and inviting friends.",
    emailHtml: `<p style="margin:0 0 12px;">Hi there 👋</p>
<p style="margin:0 0 12px;">OmniTrak has been redesigned around the questions you actually open it to answer.</p>

<h2 style="margin:20px 0 10px;font-size:18px;font-weight:700;color:#0f172a;">What's new</h2>
<ul style="margin:0 0 16px;padding-left:20px;line-height:1.7;">
  <li><strong>Bills</strong> group by what needs you — overdue, due this week, later this month — each with its own running total, plus a month calendar showing every due date at a glance. Marking one paid is a single tap on the row.</li>
  <li><strong>Expenses</strong> now tells you whether a month is heavy: what you've spent, what it projects to by month end, and how that compares with your own recent months.</li>
</ul>

<h2 style="margin:20px 0 10px;font-size:18px;font-weight:700;color:#0f172a;">Two ways to get Pro free</h2>

<div style="padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:0 0 12px;">
  <p style="margin:0;font-size:13px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:0.05em;">1. Your birth month</p>
  <p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:#0f172a;">Pro is free for your whole birth month, every year — applied automatically once your birth month is set. Set it on your profile under Account → Profile.</p>
  <p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:#475569;">Choose carefully: your birth month can only be set once and can't be changed afterwards.</p>
</div>

<div style="padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 16px;">
  <p style="margin:0;font-size:13px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.05em;">2. Invite friends</p>
  <p style="margin:6px 0 0;font-size:14px;line-height:1.6;color:#0f172a;">Every 5 friends who join through your link earns you 1 free month of Pro, and every friend who upgrades earns you 1 more. It stacks, with no cap. Grab your link from Refer &amp; Earn in the dashboard.</p>
</div>

<p style="margin:0 0 12px;">Have a look around — and tell us what you think.</p>
<p style="margin:16px 0 0;">— The OmniTrak Team</p>`,
  },
];
