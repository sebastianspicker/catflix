import { extname, relative, resolve } from "node:path";
import { URL } from "node:url";
import ts from "typescript";

const { readdir: readDirectory, readFile: readTextFile } = await import("node:fs/promises");
const sourceExtensions = new Set([".ts", ".tsx"]);
const config = JSON.parse(await readTextFile(new URL("./architecture.config.json", import.meta.url), "utf8"));
const knownModules = new Set(config.knownModules);
const allowedDependencies = new Map(
  Object.entries(config.allowedDependencies).map(([sourceModule, targets]) => [sourceModule, new Set(targets)]),
);

export async function checkSourceTree(root) {
  const sourceRoot = resolve(root);
  const sourceFiles = await collectSourceFiles(sourceRoot);
  const modules = new Map(sourceFiles.map((file) => [file, moduleFor(sourceRoot, file)]));
  const dependencies = new Map(sourceFiles.map((file) => [file, []]));
  const violations = [];

  for (const file of sourceFiles) violations.push(...await checkFileDependencies(modules, dependencies, file));
  for (const cycle of findCycles(dependencies)) violations.push(`dependency cycle: ${cycle.map(display).join(" -> ")}`);
  return { violations, fileCount: sourceFiles.length };
}

async function checkFileDependencies(modules, dependencies, file) {
  const violations = [];
  const sourceModule = modules.get(file);
  if (!knownModules.has(sourceModule)) violations.push(`${display(file)} is outside the deliberate source modules`);
  const imports = importSpecifiers(await readTextFile(file, "utf8"));
  for (const specifier of new Set(imports)) {
    violations.push(...await checkImportSpecifier(modules, dependencies, file, sourceModule, specifier));
  }
  return violations;
}

async function checkImportSpecifier(modules, dependencies, file, sourceModule, specifier) {
  if (!specifier.startsWith(".") || specifier.includes("?")) return [];
  const extension = extname(specifier);
  if (extension && !sourceExtensions.has(extension)) return [];
  const target = await resolveSourceFile(modules, file, specifier);
  if (!target) return [`${display(file)} has an unresolved relative import ${specifier}`];
  dependencies.get(file).push(target);
  const targetModule = modules.get(target);
  if (isAllowed(sourceModule, targetModule)) return [];
  return [`${display(file)} (${sourceModule}) must not depend on ${display(target)} (${targetModule})`];
}

export function checkDiagram(markdown) {
  const violations = [];
  const flowchart = markdown.match(/```mermaid\s+flowchart[^\n]*\n([\s\S]*?)```/);
  if (!flowchart) {
    violations.push("docs/ARCHITECTURE.md has no mermaid flowchart diagram");
    return violations;
  }
  for (const [, sourceId, targetId] of flowchart[1].matchAll(/(\w+)(?:\[[^\]]*\])?\s*-->\s*(\w+)(?:\[[^\]]*\])?/g)) {
    const sourceModule = config.diagramNodes[sourceId];
    const targetModule = config.diagramNodes[targetId];
    if (!sourceModule) { violations.push(`diagram node ${sourceId} has no module mapping`); continue; }
    if (!targetModule) { violations.push(`diagram node ${targetId} has no module mapping`); continue; }
    if (!isAllowed(sourceModule, targetModule)) {
      violations.push(`diagram edge ${sourceId} --> ${targetId} (${sourceModule} -> ${targetModule}) is not an allowed dependency`);
    }
  }
  return violations;
}

async function collectSourceFiles(directory) {
  const entries = await readDirectory(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => entry.isDirectory()
    ? collectSourceFiles(resolve(directory, entry.name))
    : sourceExtensions.has(extname(entry.name)) && !isTestFile(entry.name) ? [resolve(directory, entry.name)] : []));
  return nested.flat();
}

function isTestFile(fileName) {
  return fileName.endsWith(".test.ts") || fileName.endsWith(".test.tsx");
}

function moduleFor(sourceRoot, file) {
  const sourcePath = relative(sourceRoot, file);
  for (const rule of config.moduleRules) {
    if (rule.exact && sourcePath === rule.exact) return rule.module;
    if (rule.prefix && sourcePath.startsWith(rule.prefix)) return rule.module;
  }
  return sourcePath.split("/")[0];
}

function importSpecifiers(source) {
  return ts.preProcessFile(source, true, true).importedFiles.map((imported) => imported.fileName);
}

async function resolveSourceFile(modules, from, specifier) {
  const base = resolve(from, "..");
  const candidate = resolve(base, specifier);
  for (const option of [candidate, `${candidate}.ts`, `${candidate}.tsx`, resolve(candidate, "index.ts"), resolve(candidate, "index.tsx")]) {
    if (modules.has(option)) return option;
  }
  return undefined;
}

function isAllowed(sourceModule, targetModule) {
  if (sourceModule === targetModule) return true;
  return allowedDependencies.get(sourceModule)?.has(targetModule) ?? false;
}

function findCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];
  const reported = new Set();
  const visit = (node) => {
    if (visiting.has(node)) {
      const cycle = [...stack.slice(stack.indexOf(node)), node];
      const key = cycle.slice(0, -1).sort().join("|");
      if (!reported.has(key)) { reported.add(key); cycles.push(cycle); }
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };
  for (const node of graph.keys()) visit(node);
  return cycles;
}

function display(file) {
  return relative(process.cwd(), file);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { violations: importViolations, fileCount } = await checkSourceTree("src");
  const diagramViolations = checkDiagram(await readTextFile(resolve("docs/ARCHITECTURE.md"), "utf8"));
  const violations = [...importViolations, ...diagramViolations];
  if (violations.length > 0) {
    console.error("Architecture check failed:\n" + violations.map((violation) => `- ${violation}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Architecture check passed for ${fileCount} source files.`);
  }
}
