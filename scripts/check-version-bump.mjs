/**
 * Usage: node scripts/check-version-bump.mjs
 * Run from .githooks/pre-commit, before sync-version.mjs.
 *
 * Guards the two ways a release number has gone wrong by accident:
 *
 *   1. Two new version blocks in one commit. A commit is one release at most —
 *      this happened once and shipped two releases' worth of changelog together.
 *   2. A minor or major bump whose top block contains no `type: "feature"`.
 *      Renames, route moves, re-skins and refactors are improvements however much
 *      work they took; only a genuinely new capability earns a minor.
 *
 * Both are refusals, not warnings, because the version is already staged by the
 * time anyone would read a warning. Override a deliberate exception with:
 *
 *   OMNITRAK_ALLOW_VERSION_JUMP=1 git commit ...
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

if (process.env.OMNITRAK_ALLOW_VERSION_JUMP === "1") process.exit(0);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEMVER_LINE = /version:\s*"(\d+\.\d+\.\d+)"/g;

let stagedDiff = "";
try {
  stagedDiff = execSync("git diff --cached -- src/lib/changelog.ts", { encoding: "utf8" });
} catch {
  process.exit(0); // Not a git repo, or git unavailable — nothing to check.
}
if (!stagedDiff.trim()) process.exit(0); // Changelog untouched.

function fail(lines) {
  console.error("\n[version-check] " + lines.join("\n[version-check] ") + "\n");
  process.exit(1);
}

// ── 1. More than one new version block ─────────────────────────────────────
const addedVersions = stagedDiff
  .split("\n")
  .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
  .map((l) => l.match(/version:\s*"(\d+\.\d+\.\d+)"/))
  .filter(Boolean)
  .map((m) => m[1]);

if (addedVersions.length > 1) {
  fail([
    `This commit adds ${addedVersions.length} version blocks: ${addedVersions.join(", ")}.`,
    "A commit is one release at most.",
    "Merge them into a single block, or split them across separate commits.",
  ]);
}

// ── 2. Minor/major bump with nothing that is actually a feature ────────────
const changelog = readFileSync(join(root, "src", "lib", "changelog.ts"), "utf8");
const all = [...changelog.matchAll(SEMVER_LINE)];
if (all.length === 0) process.exit(0);

const target = all[0][1];
const current = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const [cMaj, cMin] = current.split(".").map(Number);
const [tMaj, tMin] = target.split(".").map(Number);
const isMinorOrMajor = tMaj > cMaj || (tMaj === cMaj && tMin > cMin);

if (isMinorOrMajor) {
  // The top block runs from its own version line to the next entry's, or to the end.
  const topBlock = changelog.slice(all[0].index, all[1]?.index ?? changelog.length);
  if (!/type:\s*"feature"/.test(topBlock)) {
    fail([
      `Top changelog entry is ${target}, a ${tMaj > cMaj ? "major" : "minor"} bump from ${current},`,
      'but its block contains no { type: "feature" } change.',
      "",
      "Renames, route moves, re-skins and refactors are improvements, not features.",
      `If that is what this is, renumber the top entry to a patch (e.g. ${cMaj}.${cMin}.${Number(current.split(".")[2]) + 1}).`,
      "If it really is a new capability, mark the change as a feature.",
      "",
      "Deliberate exception: OMNITRAK_ALLOW_VERSION_JUMP=1 git commit ...",
    ]);
  }
}
