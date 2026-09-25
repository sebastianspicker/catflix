import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const maximumNonblankLines = 300;
const checkedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".css"]);
const ignoredDirectories = new Set([
  ".agents",
  ".claude",
  ".codex",
  ".git",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
  "tmp",
]);
const files = await collectFiles(root);
const violations = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const nonblankLines = source.split(/\r?\n/u).filter((line) => line.trim().length > 0).length;
  if (nonblankLines > maximumNonblankLines) {
    violations.push(`${relative(root, file)} has ${nonblankLines} nonblank lines (maximum ${maximumNonblankLines})`);
  }
}

if (violations.length > 0) {
  console.error(`Source-size check failed:\n${violations.map((violation) => `- ${violation}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Source-size check passed for ${files.length} files (maximum ${maximumNonblankLines} nonblank lines).`);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) return ignoredDirectories.has(entry.name) ? [] : collectFiles(file);
    return checkedExtensions.has(extname(entry.name)) ? [file] : [];
  }));
  return nested.flat();
}
