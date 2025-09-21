import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const isBaseline = process.argv.includes("--baseline");

async function main() {
  const path = process.argv[2];
  console.log("Mode:", isBaseline ? "baseline" : "current");
  console.log("Path:", path);
  console.log("Options:", options);
  console.log("");

  const ts1 = performance.now();
  const fingerprint = await calculateFingerprint(path, options);
  const ts2 = performance.now();
  console.log(`🫆 Fingerprint: ${(ts2 - ts1).toFixed(1)}ms`);
  console.log(formatFingerprint(fingerprint));

  const fingerprintSync = calculateFingerprintSync(path, options);
  compareFingerprints(fingerprint, fingerprintSync, "Sync Fingerprint check");

  const filename = isBaseline ? "baseline.json" : "current.json";
  mkdirSync(".fingerprint", { recursive: true });
  writeFileSync(`.fingerprint/${filename}`, JSON.stringify(fingerprint, null, 2));
  console.log(`Wrote .fingerprint/${filename}`);

  const otherFilename = isBaseline ? "current.json" : "baseline.json";
  if (existsSync(`.fingerprint/${otherFilename}`)) {
    const content = readFileSync(`.fingerprint/${otherFilename}`, "utf-8");
    const otherFingerprint = JSON.parse(content) as FingerprintResult;
    compareFingerprints(fingerprint, otherFingerprint, "Baseline fingerprint check");
  } else {
    console.log(`No .fingerprint/${otherFilename} to compare against`);
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
