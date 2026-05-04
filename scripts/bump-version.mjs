/**
 * Usage: node scripts/bump-version.mjs [patch|minor|major]
 * Defaults to "patch" when no argument is given.
 *
 * Updates both package.json and src/lib/version.ts.
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
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

// ── Update top changelog entry — only if a NEW entry was added ─────────────
// Only stamp the version when this commit's staged diff actually adds a new
// changelog entry block. Modifications to existing entries (or no changelog
// changes at all) leave the changelog untouched.
let newEntryAdded = false;
try {
  const stagedDiff = execSync(
    "git diff --cached -- src/lib/changelog.ts",
    { encoding: "utf8" },
  );
  newEntryAdded = /^\+\s*version:\s*"[\d.]+"/m.test(stagedDiff);
} catch { /* outside a git repo or git unavailable — skip */ }

if (newEntryAdded) {
  const changelogPath = join(root, "src", "lib", "changelog.ts");
  const changelog = readFileSync(changelogPath, "utf8");
  const escapedPrev = prev.replace(/\./g, "\\.");
  const placeholder = new RegExp(`version:\\s*"${escapedPrev}"`);
  if (placeholder.test(changelog)) {
    const updated = changelog.replace(placeholder, `version: "${next}"`);
    writeFileSync(changelogPath, updated);
  }
}

console.log(`[bump] ${prev} → ${next}  (${type})`);
