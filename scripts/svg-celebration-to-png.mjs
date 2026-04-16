import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const goalsDir = join(root, "public", "images", "goals");
const pngSourcePath = join(goalsDir, "celebration-source.png");
const svgPath = join(goalsDir, "celebration.svg");
const pngPath = join(goalsDir, "celebration.png");

const resizeOpts = {
  width: 400,
  height: 500,
  fit: "contain",
  background: { r: 0, g: 0, b: 0, alpha: 0 },
};

let buf;
if (existsSync(pngSourcePath)) {
  buf = await sharp(pngSourcePath).ensureAlpha().resize(resizeOpts).png().toBuffer();
  console.log("Source:", pngSourcePath);
} else {
  const svg = readFileSync(svgPath);
  buf = await sharp(svg, { density: 300 }).resize(resizeOpts).png().toBuffer();
  console.log("Source:", svgPath);
}

writeFileSync(pngPath, buf);
console.log("Wrote", pngPath);
