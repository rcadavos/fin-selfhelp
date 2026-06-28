// Splits extracted document text into overlapping chunks for embedding.
// Char-based (≈4 chars/token) so we avoid pulling in a tokenizer dependency.

import {
  CHUNK_SIZE_CHARS,
  CHUNK_OVERLAP_CHARS,
  APPROX_CHARS_PER_TOKEN,
} from "@/lib/constants/ai";

export type TextChunk = { content: string; tokenCount: number };

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Find a natural break (paragraph, then sentence, then newline) inside a slice. */
function lastBoundary(slice: string): number {
  const paragraph = slice.lastIndexOf("\n\n");
  if (paragraph > 0) return paragraph + 2;
  const sentence = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("\n"),
  );
  return sentence > 0 ? sentence + 1 : slice.length;
}

export function chunkText(raw: string): TextChunk[] {
  const text = normalizeWhitespace(raw);
  if (!text) return [];

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE_CHARS, text.length);

    // Prefer breaking on a natural boundary, but only if it doesn't shrink the
    // chunk below half size (otherwise we'd make too many tiny chunks).
    if (end < text.length) {
      const boundary = lastBoundary(text.slice(start, end));
      if (boundary > CHUNK_SIZE_CHARS * 0.5) end = start + boundary;
    }

    const content = text.slice(start, end).trim();
    if (content) chunks.push({ content, tokenCount: estimateTokens(content) });

    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1);
  }

  return chunks;
}
