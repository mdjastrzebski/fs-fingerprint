import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import gitDiff from "git-diff";

import {
  calculateFingerprint,
  calculateFingerprintSync,
  type Fingerprint,
  type FingerprintOptions,
  getGitIgnoredPaths,
} from "../src/index.js";

const defaultOptions: FingerprintOptions = {
  files: ["android", "package.json"],
  ignores: ["node_modules", "dist"],
};

const iosOptions: FingerprintOptions = {
  files: ["ios", "package.json"],
  ignores: ["node_modules", "dist"],
};

const androidOptions: FingerprintOptions = {
  files: ["android", "package.json"],
  ignores: ["node_modules", "dist"],
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
  const basePath = positionals[0] ?? process.cwd();
  if (!existsSync(basePath)) {
    console.error(`Path does not exist: ${basePath}`);
    process.exit(1);
  }

  console.log("Mode:", isBaseline ? "baseline" : "current");
  console.log("Project type:", projectType);
  console.log("Path:", basePath);
  console.log("Options:", options);

  const tsGitIgnore0 = performance.now();
  const gitIgnoredPaths = getGitIgnoredPaths(basePath);
  const tsGitIgnore1 = performance.now();
  console.log(
    `Git-Ignored paths (${(tsGitIgnore1 - tsGitIgnore0).toFixed(1)}ms):`,
    gitIgnoredPaths,
  );
  console.log("");

  const outputDir = join(basePath, ".fingerprint");

  const tsSync0 = performance.now();
  const fingerprintSync = calculateFingerprintSync(basePath, options);
  const tsSync1 = performance.now();
  console.log(`Sync Fingerprint: ${(tsSync1 - tsSync0).toFixed(1)}ms`);

  const tsAsync0 = performance.now();
  const fingerprint = await calculateFingerprint(basePath, options);
  const tsAsync1 = performance.now();
  console.log(`Async Fingerprint: ${(tsAsync1 - tsAsync0).toFixed(1)}ms`);
  compareFingerprints(fingerprint, fingerprintSync, "Sync Fingerprint check");

  console.log("\n" + formatFingerprint(fingerprint));

  const filename = isBaseline ? `baseline-${projectType}.json` : `current-${projectType}.json`;
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(`${outputDir}/${filename}`, JSON.stringify(fingerprint, null, 2));
  console.log(`Wrote ${outputDir}/${filename}`);

  const otherFilename = isBaseline ? `current-${projectType}.json` : `baseline-${projectType}.json`;
  if (existsSync(`${outputDir}/${otherFilename}`)) {
    const content = readFileSync(`${outputDir}/${otherFilename}`, "utf-8");
    const otherFingerprint = JSON.parse(content) as Fingerprint;
    compareFingerprints(fingerprint, otherFingerprint, "Baseline fingerprint check");
  } else {
    console.log(`No ${outputDir}/${otherFilename} to compare against`);
  }
}

function formatFingerprint(fingerprint: Fingerprint): string {
  let result = `Hash: ${fingerprint.hash}\n`;
  result += `Files:\n`;
  fingerprint.files.forEach((input) => {
    result += `- ${input.path} - ${input.hash}\n`;
  });
  result += `Content:\n`;
  fingerprint.content.forEach((input) => {
    result += `- ${input.key} - ${input.hash}\n`;
  });

  return result;
}

function compareFingerprints(current: Fingerprint, baseline: Fingerprint, title: string) {
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
