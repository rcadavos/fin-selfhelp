import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const QR_DIR = path.join(process.cwd(), "src", "qr-payment");
const CANDIDATES = [
  { file: "unionbank-qr.png", contentType: "image/png" as const },
  { file: "unionbank-qr.jpg", contentType: "image/jpeg" as const },
];

export async function GET() {
  for (const { file, contentType } of CANDIDATES) {
    try {
      const filePath = path.join(QR_DIR, file);
      const buffer = await readFile(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      continue;
    }
  }
  return new NextResponse(null, { status: 404 });
}
