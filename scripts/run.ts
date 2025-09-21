import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import gitDiff from "git-diff";

import {
  calculateFingerprint,
  calculateFingerprintSync,
  type FingerprintOptions,
  type FingerprintResult,
} from "../src/index.js";

const options: FingerprintOptions = {
  include: ["android", "package.json"],
  exclude: ["node_modules", "dist"],
};

const { values, positionals } = parseArgs({
  options: {
    baseline: { type: "boolean" },
  },
  allowPositionals: true,
});

const isBaseline = values.baseline ?? false;

async function main() {
  const rootDir = positionals[0] ?? process.cwd();
  if (!existsSync(rootDir)) {
    console.error(`Path does not exist: ${rootDir}`);
    process.exit(1);
  }

  console.log("Mode:", isBaseline ? "baseline" : "current");
  console.log("Path:", rootDir);
  console.log("Options:", options);
  console.log("");

  const outputDir = join(rootDir, ".fingerprint");

  const ts1 = performance.now();
  const fingerprint = await calculateFingerprint(rootDir, options);
  const ts2 = performance.now();
  console.log(`Fingerprint: ${(ts2 - ts1).toFixed(1)}ms`);
  console.log(formatFingerprint(fingerprint));

  const ts3 = performance.now();
  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const ts4 = performance.now();
  console.log(`Sync Fingerprint: ${(ts4 - ts3).toFixed(1)}ms`);
  compareFingerprints(fingerprint, fingerprintSync, "Sync Fingerprint check");

  const filename = isBaseline ? "baseline.json" : "current.json";
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(`${outputDir}/${filename}`, JSON.stringify(fingerprint, null, 2));
  console.log(`Wrote ${outputDir}/${filename}`);

  const otherFilename = isBaseline ? "current.json" : "baseline.json";
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
