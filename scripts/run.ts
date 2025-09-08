import {
  calculateFingerprint,
  calculateFingerprintSync,
  type FingerprintInputHash,
  type FingerprintOptions,
  type FingerprintResult,
} from "../src/index.js";

const options: FingerprintOptions = {
  include: ["android", "package.json"],
  exclude: ["node_modules", "dist"],
};

const path = process.argv[2];
console.log("Path:", path);
console.log("Options:", options);
console.log("");

console.log("--- Fingerprint ---");
const fingerprint = await calculateFingerprint(path, options);
console.log(formatFingerprint(fingerprint));

const fingerprintSync = calculateFingerprintSync(path, options);
const isMatch = fingerprint.hash === fingerprintSync.hash;

console.log("--- Check ---");
console.log(`Fingerprint: ${isMatch ? "match ✅" : "mismatch ❌"}`);

if (!isMatch) {
  console.log("--- Fingerprint Sync ---");
  console.log(formatFingerprint(fingerprintSync));
}

function formatFingerprint(fingerprint: FingerprintResult, limit = 3): string {
  let result = `Hash: ${fingerprint.hash}\n`;
  result += `Inputs:\n`;
  result += formatInputs(fingerprint.inputs, 1, limit + 1);
  return result;
}

function formatInputs(inputs: FingerprintInputHash[], indent = 0, limit = 3): string {
  let result = "";
  for (const input of inputs) {
    const name = input.key.split(":")[1];

    result += `${"    ".repeat(indent)}- ${input.type.toUpperCase()} ${name} - ${input.hash}\n`;
    if (input.type === "directory" && indent + 1 < limit) {
      result += formatInputs(input.children, indent + 1, limit);
    }
  }

  return result;
}
