/**
 * Usage: node scripts/sync-version.mjs
 *
 * Makes package.json and src/lib/version.ts match the version of the TOP entry
 * in src/lib/changelog.ts, which is the single source of truth for the release
 * number. No-op when they already agree.
 *
 * Run from .githooks/pre-commit — not commit-msg. A `git add` inside commit-msg
 * does not reach the commit being created (git has already snapshotted the index
 * by then), which is how the app once shipped a commit whose version.ts said
 * 1.7.5 while its own changelog entry announced 1.8.0.
 *
 * Exits non-zero only on a malformed changelog, so a typo fails the commit
 * instead of silently shipping a wrong version.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER = /version:\s*"(\d+\.\d+\.\d+)"/;

const changelogPath = join(root, "src", "lib", "changelog.ts");
const match = readFileSync(changelogPath, "utf8").match(SEMVER);
if (!match) {
  console.error("[sync-version] No `version: \"x.y.z\"` found in src/lib/changelog.ts");
  process.exit(1);
}
const target = match[1];

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const versionTsPath = join(root, "src", "lib", "version.ts");

if (pkg.version === target) {
  // Nothing to do: the common case for a commit that adds no changelog entry.
  process.exit(0);
}

pkg.version = target;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
writeFileSync(versionTsPath, `export const APP_VERSION = "${target}";\n`);

console.log(`[sync-version] package.json + version.ts → ${target} (from changelog)`);
