import type { Fingerprint } from "../src/index.js";

export function formatFingerprint(fingerprint: Fingerprint): string {
  let result = `Hash: ${fingerprint.hash}\n`;

  result += `Files:\n`;
  for (const file of fingerprint.files) {
    result += `- ${file.path} - ${file.hash}\n`;
  }

  result += `Inputs:\n`;
  for (const input of fingerprint.inputs) {
    result += `- ${input.key} - ${input.hash}\n`;
  }

  return result;
}
