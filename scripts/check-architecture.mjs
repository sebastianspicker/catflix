import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkDiagram, checkSourceTree } from "./architecture.mjs";

const { violations: importViolations, fileCount } = await checkSourceTree("src");
const diagramViolations = checkDiagram(await readFile(resolve("docs/ARCHITECTURE.md"), "utf8"));
const violations = [...importViolations, ...diagramViolations];
if (violations.length > 0) {
  console.error("Architecture check failed:\n" + violations.map((violation) => `- ${violation}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Architecture check passed for ${fileCount} source files.`);
}
