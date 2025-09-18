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

/**
 * Format a FingerprintResult as a human-readable multi-line string.
 *
 * The output starts with "Hash: {hash}" followed by an "Inputs:" section listing
 * each input on its own line in the form:
 *     - {TYPE} {name} - {hash}
 *
 * The input `name` is taken from the portion after the first ":" in `input.key`
 * (i.e., `input.key.split(':')[1]`), and `input.type` is rendered uppercased.
 *
 * @param fingerprint - The fingerprint to format.
 * @returns A multi-line string containing the fingerprint hash and a flat list of inputs.
 */
function formatFingerprint(fingerprint: FingerprintResult): string {
  let result = `Hash: ${fingerprint.hash}\n`;
  result += `Inputs:\n`;
  fingerprint.inputs.forEach((input) => {
    const name = input.key.split(":")[1];
    result += `    - ${input.type.toUpperCase()} ${name} - ${input.hash}\n`;
  });

  return result;
}
