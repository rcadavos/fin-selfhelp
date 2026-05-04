/**
 * Usage: node scripts/bump-version.mjs [patch|minor|major]
 * Defaults to "patch" when no argument is given.
 *
 * Updates both package.json and src/lib/version.ts.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Read current version ────────────────────────────────────────────────────
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);
const prev = pkg.version;

// ── Compute new version ─────────────────────────────────────────────────────
const type = process.argv[2] ?? "patch";
let next;
if (type === "major") {
  next = `${major + 1}.0.0`;
} else if (type === "minor") {
  next = `${major}.${minor + 1}.0`;
} else {
  next = `${major}.${minor}.${patch + 1}`;
}

// ── Write package.json ──────────────────────────────────────────────────────
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// ── Write src/lib/version.ts ────────────────────────────────────────────────
const versionTsPath = join(root, "src", "lib", "version.ts");
writeFileSync(versionTsPath, `export const APP_VERSION = "${next}";\n`);

// ── Update top changelog entry to the bumped version ───────────────────────
// The top entry is written by Claude with an estimated version; the hook is
// the authoritative source so it overwrites whatever version was pre-assigned.
const changelogPath = join(root, "src", "lib", "changelog.ts");
const changelog = readFileSync(changelogPath, "utf8");
const updated = changelog.replace(/version:\s*"[\d.]+"/, `version: "${next}"`);
writeFileSync(changelogPath, updated);

console.log(`[bump] ${prev} → ${next}  (${type})`);
