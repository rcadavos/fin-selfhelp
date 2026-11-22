/**
 * Usage: node scripts/check-migrations.mjs
 * Run from .githooks/pre-commit and from .github/workflows/supabase-migrations.yml.
 *
 * Refuses two files in supabase/migrations/ that share a version number.
 *
 * The Supabase CLI takes everything before the first "_" as the version and
 * records it in supabase_migrations.schema_migrations, whose primary key is
 * that version. Two files numbered 098 meant `db push` applied the first, then
 * failed inserting 098 again for the second, so the second and every file
 * after it never reached the database. The workflow kept failing on every push
 * until the second file was renumbered.
 */

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "migrations",
);

const filesByVersion = new Map();
for (const file of readdirSync(MIGRATIONS_DIR)) {
  const match = /^(\d+)_.*\.sql$/.exec(file);
  if (!match) continue;
  const files = filesByVersion.get(match[1]) ?? [];
  files.push(file);
  filesByVersion.set(match[1], files);
}

const duplicates = [...filesByVersion].filter(([, files]) => files.length > 1);
if (duplicates.length === 0) process.exit(0);

const highest = [...filesByVersion.keys()].sort().at(-1);
const width = highest.length;
const next = String(Number(highest) + 1).padStart(width, "0");

console.error("Two or more migrations share a version number:\n");
for (const [version, files] of duplicates) {
  console.error(`  ${version}: ${files.join(", ")}`);
}
console.error(
  "\nSupabase records each version once, so `db push` would stop at the second file.\n" +
    "Renumber the one that has NOT been applied yet to the next free number " +
    `(${next}), e.g.\n\n  git mv supabase/migrations/<file> supabase/migrations/${next}_<name>.sql\n`,
);
process.exit(1);
