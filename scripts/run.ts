import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import gitDiff from "git-diff";

import {
  calculateFingerprint,
  calculateFingerprintSync,
  type FingerprintOptions,
  type FingerprintResult,
  listGitIgnoredFiles,
} from "../src/index.js";

const defaultOptions: FingerprintOptions = {
  include: ["android", "package.json"],
  exclude: ["node_modules", "dist"],
};

const iosOptions: FingerprintOptions = {
  include: ["ios", "package.json"],
  exclude: ["node_modules", "dist"],
};

const androidOptions: FingerprintOptions = {
  include: ["android", "package.json"],
  exclude: ["node_modules", "dist"],
};

const { values, positionals } = parseArgs({
  options: {
    baseline: { type: "boolean" },
    ios: { type: "boolean" },
    android: { type: "boolean" },
  },
  allowPositionals: true,
});

const isBaseline = values.baseline ?? false;

const projectType = values.ios ? "ios" : values.android ? "android" : "default";
const options = values.ios ? iosOptions : values.android ? androidOptions : defaultOptions;

async function main() {
  const rootDir = positionals[0] ?? process.cwd();
  if (!existsSync(rootDir)) {
    console.error(`Path does not exist: ${rootDir}`);
    process.exit(1);
  }

  console.log("Mode:", isBaseline ? "baseline" : "current");
  console.log("Project type:", projectType);
  console.log("Path:", rootDir);
  console.log("Options:", options);
  console.log("Ignored paths:", options.exclude?.join(", ") ?? "none");

  const tsGitIgnore0 = performance.now();
  const gitIgnoredPaths = listGitIgnoredFiles(rootDir);
  const tsGitIgnore1 = performance.now();
  console.log(
    `Git-Ignored paths (${(tsGitIgnore1 - tsGitIgnore0).toFixed(1)}ms)`,
    gitIgnoredPaths.join(", ") || "none",
  );
  console.log("");

  const outputDir = join(rootDir, ".fingerprint");

  const tsAsync0 = performance.now();
  const fingerprint = await calculateFingerprint(rootDir, options);
  const tsAsync1 = performance.now();
  console.log(`Fingerprint: ${(tsAsync1 - tsAsync0).toFixed(1)}ms`);
  console.log(formatFingerprint(fingerprint));

  const tsSync0 = performance.now();
  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const tsSync1 = performance.now();
  console.log(`Sync Fingerprint: ${(tsSync1 - tsSync0).toFixed(1)}ms`);
  compareFingerprints(fingerprint, fingerprintSync, "Sync Fingerprint check");

  const filename = isBaseline ? `baseline-${projectType}.json` : `current-${projectType}.json`;
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(`${outputDir}/${filename}`, JSON.stringify(fingerprint, null, 2));
  console.log(`Wrote ${outputDir}/${filename}`);

  const otherFilename = isBaseline ? `current-${projectType}.json` : `baseline-${projectType}.json`;
  if (existsSync(`${outputDir}/${otherFilename}`)) {
    const content = readFileSync(`${outputDir}/${otherFilename}`, "utf-8");
    const otherFingerprint = JSON.parse(content) as FingerprintResult;
    compareFingerprints(fingerprint, otherFingerprint, "Baseline fingerprint check");
  } else {
    console.log(`No ${outputDir}/${otherFilename} to compare against`);
  }
}

function formatFingerprint(fingerprint: FingerprintResult): string {
  let result = `Hash: ${fingerprint.hash}\n`;
  result += `Inputs:\n`;
  fingerprint.inputs.forEach((input) => {
    const name = input.key.split(":")[1];
    result += `    - ${input.type.toUpperCase()} ${name} - ${input.hash}\n`;
  });

  return result;
}

function compareFingerprints(
  current: FingerprintResult,
  baseline: FingerprintResult,
  title: string,
) {
  const isMatch = current.hash === baseline.hash;
  console.log(`${title}: ${isMatch ? "match ✅" : "mismatch ❌"}`);

  const currentString = formatFingerprint(current);
  const baselineString = formatFingerprint(baseline);
  const diff = gitDiff(baselineString, currentString, { color: false, noHeaders: true });
  if (diff) {
    console.log("Diff:");
    console.log(diff);
  }
}

main();
