import type { Fingerprint } from "../src/index.js";

export function formatFingerprint(fingerprint: Fingerprint): string {
  let result = `Hash: ${fingerprint.hash}\n`;

  result += `Files:\n`;
  for (const file of fingerprint.files) {
    result += `- ${file.path} - ${file.hash}\n`;
  }

  result += `Data:\n`;
  for (const input of fingerprint.data) {
    result += `- ${input.key} - ${input.hash}\n`;
  }

  return result;
}
