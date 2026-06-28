// Text extraction for the knowledge base.
//  • PDF  → unpdf (serverless-friendly, no native deps)
//  • txt/md → decoded as UTF-8
//  • URL  → Firecrawl scrape → clean Markdown
// Server-only — imported from the ingestion server action.

import { extractText, getDocumentProxy } from "unpdf";
import Firecrawl from "@mendable/firecrawl-js";

export type UrlExtraction = { text: string; title: string };

/** Extract plain text from an uploaded file's bytes, by mime type / extension. */
export async function extractFromBuffer(
  buffer: ArrayBuffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase();
  const isPdf = mimeType === "application/pdf" || lower.endsWith(".pdf");

  if (isPdf) {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  // text/plain, text/markdown, and any other text-like upload.
  return new TextDecoder().decode(buffer);
}

/** True when URL ingestion is available (Firecrawl key present). */
export function isUrlIngestionConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}

/** Crawl a URL into clean Markdown via Firecrawl. */
export async function extractFromUrl(url: string): Promise<UrlExtraction> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "URL ingestion is not configured. Add FIRECRAWL_API_KEY to enable it.",
    );
  }

  const firecrawl = new Firecrawl({ apiKey });
  const doc = await firecrawl.scrape(url, { formats: ["markdown"] });

  const text = (doc.markdown ?? "").trim();
  if (!text) {
    throw new Error("Could not extract any readable content from that URL.");
  }

  let fallbackTitle = url;
  try {
    fallbackTitle = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // keep the raw url as the fallback title
  }

  return { text, title: doc.metadata?.title?.trim() || fallbackTitle };
}
