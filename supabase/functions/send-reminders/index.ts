const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET") ?? "";

Deno.serve(async (req: Request) => {
  const auth = req.headers.get("authorization") ?? "";
  if (!FUNCTION_SECRET || auth !== `Bearer ${FUNCTION_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!SITE_URL || !CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: "SITE_URL or CRON_SECRET not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const res = await fetch(`${SITE_URL}/api/cron/reminder-emails`, {
    method: "GET",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});
