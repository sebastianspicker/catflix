import { extname, relative, resolve } from "node:path";

const { readdir: readDirectory, readFile: readTextFile } = await import("node:fs/promises");
const sourceRoot = resolve("src");
const sourceExtensions = new Set([".ts", ".tsx"]);
const sourceFiles = await collectSourceFiles(sourceRoot);
const modules = new Map(sourceFiles.map((file) => [file, moduleFor(file)]));
const dependencies = new Map(sourceFiles.map((file) => [file, []]));
const violations = [];
const knownModules = new Set([
  "ambient", "app", "catalogue-model", "catalogue-ui", "domain", "encounter-engine",
  "encounter-runtime", "encounter-session", "encounter-ui", "local-data", "platform",
  "research", "root", "ui",
]);

for (const file of sourceFiles) {
  const sourceModule = modules.get(file);
  if (!knownModules.has(sourceModule)) violations.push(`${display(file)} is outside the deliberate source modules`);
  const imports = importSpecifiers(await readTextFile(file, "utf8"));
  for (const specifier of new Set(imports)) {
    if (specifier.includes("/content/") || specifier.includes("/components/") || specifier.includes("/simulation/") || specifier.includes("/storage/") || specifier.includes("/validation/")) {
      violations.push(`${display(file)} imports removed legacy path ${specifier}`);
      continue;
    }
    if (!specifier.startsWith(".") || specifier.includes("?")) continue;
    const extension = extname(specifier);
    if (extension && !sourceExtensions.has(extension)) continue;
    const target = await resolveSourceFile(file, specifier);
    if (!target) {
      violations.push(`${display(file)} has an unresolved relative import ${specifier}`);
      continue;
    }
    dependencies.get(file).push(target);
    const targetModule = modules.get(target);
    if (!isAllowed(sourceModule, targetModule, file)) {
      violations.push(`${display(file)} (${sourceModule}) must not depend on ${display(target)} (${targetModule})`);
    }
  }
}

for (const cycle of findCycles(dependencies)) violations.push(`dependency cycle: ${cycle.map(display).join(" -> ")}`);

if (violations.length > 0) {
  console.error("Architecture check failed:\n" + violations.map((violation) => `- ${violation}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Architecture check passed for ${sourceFiles.length} source files.`);
}

async function collectSourceFiles(directory) {
  const entries = await readDirectory(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => entry.isDirectory()
    ? collectSourceFiles(resolve(directory, entry.name))
    : sourceExtensions.has(extname(entry.name)) && !entry.name.endsWith(".test.ts") ? [resolve(directory, entry.name)] : []));
  return nested.flat();
}

function moduleFor(file) {
  const sourcePath = relative(sourceRoot, file);
  const [topLevel, secondLevel] = sourcePath.split("/");
  if (topLevel === "catalogue") return secondLevel === "model" ? "catalogue-model" : secondLevel === "ui" ? "catalogue-ui" : "unknown";
  if (topLevel === "encounter") {
    if (["engine", "runtime", "ui"].includes(secondLevel)) return `encounter-${secondLevel}`;
    return sourcePath === "encounter/session.ts" ? "encounter-session" : "unknown";
  }
  if (sourcePath === "paths.ts") return "platform";
  if (sourcePath === "vite-env.d.ts") return "ambient";
  return ["App.tsx", "main.tsx"].includes(sourcePath) ? "root" : topLevel;
}

function importSpecifiers(source) {
  const patterns = [/\bfrom\s*["']([^"'\r\n]+)["']/g, /\bimport\s*["']([^"'\r\n]+)["']/g, /\bimport\(\s*["']([^"'\r\n]+)["']\s*\)/g];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]));
}

async function resolveSourceFile(from, specifier) {
  const base = resolve(from, "..");
  const candidate = resolve(base, specifier);
  for (const option of [candidate, `${candidate}.ts`, `${candidate}.tsx`, resolve(candidate, "index.ts"), resolve(candidate, "index.tsx")]) {
    if (modules.has(option)) return option;
  }
  return undefined;
}

function isAllowed(sourceModule, targetModule, sourceFile) {
  if (sourceModule === targetModule) return true;
  const allowed = new Map([
    ["domain", new Set()], ["catalogue-model", new Set(["domain"])],
    ["catalogue-ui", new Set(["catalogue-model", "domain", "research", "ui", "platform"])],
    ["encounter-engine", new Set(["domain"])], ["encounter-runtime", new Set(["domain", "encounter-engine", "catalogue-model", "platform"])],
    ["encounter-ui", new Set(["domain", "catalogue-model", "encounter-engine", "encounter-runtime", "encounter-session", "local-data", "ui"])],
    ["encounter-session", new Set(["domain", "catalogue-model"])], ["local-data", new Set(["domain", "catalogue-model"])],
    ["research", new Set(["ui", "platform"])], ["ui", new Set()], ["styles", new Set()], ["platform", new Set()],
    ["app", new Set(["domain", "catalogue-model", "catalogue-ui", "encounter-session", "encounter-ui", "local-data", "research", "ui"])],
    ["root", new Set(["app", "catalogue-ui", "encounter-ui", "research", "platform"])], ["ambient", new Set()],
  ]);
  if (sourceModule === "app" && targetModule === "encounter-ui") return display(sourceFile).endsWith("app/CatalogueOverlays.tsx");
  return allowed.get(sourceModule)?.has(targetModule) ?? false;
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
