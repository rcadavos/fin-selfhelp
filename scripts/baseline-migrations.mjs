// One-time baseline of supabase/migrations against the hosted database.
//
// Every migration in this repo up to now was applied by hand in the SQL
// editor, so the database has the tables but no record of *which* files put
// them there — supabase_migrations.schema_migrations is empty. The first
// `supabase db push` would therefore try to replay all of them against a live
// schema.
//
// This marks the existing files as already applied, without running their SQL,
// so that push only ever applies files added from here on.
//
// Run it ONCE, and only after confirming the live schema really does match the
// last migration listed below:
//
//   npm run db:baseline -- --through 094 --yes
//
// --through is required: it is the last migration you have actually applied by
// hand. Anything after it is left pending and will be applied by the next push.

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SUPABASE_CLI = "supabase@2.98.2";
const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "migrations",
);

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const throughIndex = args.indexOf("--through");
const through = throughIndex === -1 ? null : args[throughIndex + 1];

const versions = readdirSync(MIGRATIONS_DIR)
  .map((file) => /^(\d+)_.*\.sql$/.exec(file))
  .filter(Boolean)
  .map((match) => match[1])
  .sort();

if (versions.length === 0) {
  console.error("No migrations found in supabase/migrations.");
  process.exit(1);
}

if (!through) {
  console.error(
    "Missing --through <version>.\n\n" +
      `Migrations run ${versions[0]} … ${versions[versions.length - 1]}.\n` +
      "Pass the last one you have already applied by hand, e.g.\n\n" +
      `  npm run db:baseline -- --through ${versions[versions.length - 1]} --yes\n`,
  );
  process.exit(1);
}

if (!versions.includes(through)) {
  console.error(`No migration with version "${through}" in supabase/migrations.`);
  process.exit(1);
}

const toMark = versions.slice(0, versions.indexOf(through) + 1);
const pending = versions.slice(versions.indexOf(through) + 1);

console.log(
  `Marking ${toMark.length} migration(s) as already applied: ` +
    `${toMark[0]} … ${toMark[toMark.length - 1]}`,
);
console.log(
  pending.length
    ? `Leaving ${pending.length} pending for the next push: ${pending.join(", ")}`
    : "Nothing left pending.",
);

if (!confirmed) {
  console.log(
    "\nDry run — nothing was written. Re-run with --yes once you have checked\n" +
      "the live schema against the migrations listed above. Marking a migration\n" +
      "applied when it was NOT actually run means its SQL is skipped forever.",
  );
  process.exit(0);
}

// The repair takes every version in one call, so the history lands as a single
// consistent batch rather than partially on a mid-way failure.
const result = spawnSync(
  "npx",
  ["--yes", SUPABASE_CLI, "migration", "repair", "--status", "applied", ...toMark],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
