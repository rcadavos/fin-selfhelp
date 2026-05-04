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

// ── Update top changelog entry — only if changelog.ts was staged ───────────
// Only stamp the version when the user/Claude explicitly staged new changelog
// entries for this commit. If changelog wasn't touched, leave it alone so we
// don't mutate a previously-committed entry.
let changelogStaged = false;
try {
  const stagedFiles = execSync("git diff --cached --name-only", { encoding: "utf8" });
  changelogStaged = stagedFiles.includes("src/lib/changelog.ts");
} catch { /* outside a git repo or git unavailable — skip */ }

if (changelogStaged) {
  const changelogPath = join(root, "src", "lib", "changelog.ts");
  const changelog = readFileSync(changelogPath, "utf8");
  // Only stamp the entry whose version matches the current (pre-bump) version.
  // This targets the placeholder Claude writes and never touches older entries.
  const escapedPrev = prev.replace(/\./g, "\\.");
  const placeholder = new RegExp(`version:\\s*"${escapedPrev}"`);
  if (placeholder.test(changelog)) {
    const updated = changelog.replace(placeholder, `version: "${next}"`);
    writeFileSync(changelogPath, updated);
  } else {
    console.warn(`[bump] warning: no changelog entry found for ${prev} — skipping changelog update`);
  }
}

console.log(`[bump] ${prev} → ${next}  (${type})`);
