/**
 * Usage: node scripts/bump-version.mjs [patch|minor|major]
 * Defaults to "patch" when no argument is given.
 *
 * Raises the version in src/lib/changelog.ts's TOP entry — the source of truth —
 * and syncs package.json and src/lib/version.ts to match.
 *
 * The top entry is targeted BY POSITION, never by searching for the current
 * version string. Searching by value is what once renamed an already-released
 * changelog entry: the new entry at the top already carried the target version,
 * so the search fell through to an older entry further down the file and stamped
 * that instead, leaving two entries claiming the same release.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER = /version:\s*"(\d+\.\d+\.\d+)"/;

const changelogPath = join(root, "src", "lib", "changelog.ts");
const changelog = readFileSync(changelogPath, "utf8");
const match = changelog.match(SEMVER);
if (!match) {
  console.error("[bump] No `version: \"x.y.z\"` found in src/lib/changelog.ts");
  process.exit(1);
}

const prev = match[1];
const [major, minor, patch] = prev.split(".").map(Number);
const type = process.argv[2] ?? "patch";

let next;
if (type === "major") next = `${major + 1}.0.0`;
else if (type === "minor") next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

// Non-global replace hits the first occurrence, which is the top entry.
writeFileSync(changelogPath, changelog.replace(SEMVER, `version: "${next}"`));

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

writeFileSync(join(root, "src", "lib", "version.ts"), `export const APP_VERSION = "${next}";\n`);

console.log(`[bump] ${prev} → ${next}  (${type})`);
