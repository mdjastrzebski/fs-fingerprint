import { type FingerprintInputHash } from "../src/index.js";

/**
 * Find the first fingerprint input whose key's second colon-separated segment equals the given path.
 *
 * If `inputs` is null or undefined the function returns `null`. Each `FingerprintInputHash`'s `key`
 * is expected to be a colon-separated string; this function compares `path` to the segment at index 1
 * (i.e., the portion after the first colon) using strict equality.
 *
 * @param inputs - Array of fingerprint inputs to search (may be undefined).
 * @param path - The path string to match against the key's second colon-separated segment.
 * @returns The matching `FingerprintInputHash` if found; otherwise `null`.
 */
export function findInput(
  inputs: FingerprintInputHash[] | undefined,
  path: string,
): FingerprintInputHash | null {
  if (inputs == null) {
    return null;
  }

  const exactMatch = inputs.find((input) => input.key.split(":")[1] === path);
  if (exactMatch) {
    return exactMatch;
  }

  return null;
}
