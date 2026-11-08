// Loads lesson files (and topic.md files) from content/lessons into the database.
//
//   npm run lessons:check                 check every file, no database needed
//   npm run lessons:import                load every file
//   npm run lessons:import -- <file>...   load just these files
//   npm run lessons:import -- --author you@example.com
//
// Uses DATABASE_URL from the environment or .env.local. See content/README.md.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findAuthor, importLesson, importTopic } from "../lib/content/import";
import { isTopicFile, LessonFileError, parseLessonFile, parseTopicFile, type LessonFile, type TopicFile } from "../lib/content/lesson-file";
import { connect } from "../lib/jobs/postgres-store";

const ROOT = "content/lessons";

function lessonFiles(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return lessonFiles(path);
      return name.endsWith(".md") && name !== "README.md" ? [path] : [];
    });
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const authorAt = args.indexOf("--author");
  const authorEmail = authorAt >= 0 ? args[authorAt + 1] : undefined;
  const named = args.filter((a, i) => !a.startsWith("--") && i !== authorAt + 1);
  const paths = named.length ? named : lessonFiles(ROOT);

  const parsed: { path: string; lesson: LessonFile }[] = [];
  const topics: { path: string; topic: TopicFile }[] = [];
  const errors: string[] = [];
  for (const path of paths) {
    try {
      const text = readFileSync(path, "utf8");
      if (isTopicFile(path)) topics.push({ path, topic: parseTopicFile(text, relative(".", path)) });
      else parsed.push({ path, lesson: parseLessonFile(text, relative(".", path)) });
    } catch (err) {
      errors.push(err instanceof LessonFileError ? err.message : `${path}: ${(err as Error).message}`);
    }
  }
  if (errors.length) {
    console.error(`Fix these before importing:\n\n${errors.join("\n\n")}`);
    process.exit(1);
  }
  if (checkOnly) {
    console.log(`All ${parsed.length} lesson files and ${topics.length} topic files look good.`);
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (in .env.local or the environment).");
  const sql = connect(url);
  try {
    const authorId = await findAuthor(sql, authorEmail);
    // Topics first, so their goals are set before lessons land in them.
    for (const { path, topic } of topics) {
      const r = await importTopic(sql, authorId, topic);
      for (const m of r.made) console.log(`  made ${m}`);
      console.log(`${(r.outcome === "unchanged" ? "unchanged" : "topic").padEnd(9)} ${path}`);
    }
    const counts = { created: 0, updated: 0, unchanged: 0 };
    for (const { path, lesson } of parsed) {
      const r = await importLesson(sql, authorId, lesson);
      counts[r.outcome]++;
      for (const m of r.made) console.log(`  made ${m}`);
      console.log(`${r.outcome.padEnd(9)} ${path}`);
    }
    console.log(`\n${counts.created} new (as drafts), ${counts.updated} updated, ${counts.unchanged} unchanged.`);
    if (counts.created) console.log("Publish new lessons from the author pages once you've looked them over.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
