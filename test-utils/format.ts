import type { ContentHash, Fingerprint } from "../src/index.js";

export function formatFingerprint(fingerprint: Fingerprint): string {
  let result = `Hash: ${fingerprint.hash}\n`;

  result += `Files:\n`;
  for (const file of fingerprint.files) {
    result += `- ${file.path} - ${file.hash}\n`;
  }

  result += `Content:\n`;
  for (const input of fingerprint.content) {
    result += `- ${input.key} - ${input.hash}\n`;
  }

  return result;
}

export function formatContentHashes(contentHashes: ContentHash[]): string {
  let result = "";
  for (const entry of contentHashes) {
    result += `- ${entry.key} - ${entry.hash} - ${entry.content}\n`;
  }
  return result;
}
