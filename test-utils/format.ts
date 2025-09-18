import type { FingerprintInputHash, FingerprintResult } from "../src/index.js";

export function formatFingerprint(fingerprint: FingerprintResult): string {
  let result = `Hash: ${fingerprint.hash}\n`;
  result += `Inputs:\n`;
  result += formatInputs(fingerprint.inputs, 2);
  return result;
}

export function formatInputs(inputs: (FingerprintInputHash | null)[], indent = 0): string {
  let result = "";
  for (const input of inputs) {
    result += formatInputHash(input, indent);
  }

  return result;
}

export function formatInputHash(input: FingerprintInputHash | null, indent = 0): string {
  if (input == null) {
    return "(null)\n";
  }

  const name = input.key.split(":")[1];
  return `${" ".repeat(indent)}- ${name} - ${input.hash}\n`;
}
