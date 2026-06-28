// TEMPORARY probe — forces webpack to compile the extract.ts (firecrawl + unpdf)
// chain so we can confirm serverExternalPackages fixed the bundling error. Delete after.
import { extractFromBuffer } from "@/lib/ai/extract";

export const dynamic = "force-dynamic";

export async function GET() {
  void extractFromBuffer;
  return new Response("probe-ok");
}
