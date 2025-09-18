import { type FingerprintInputHash } from "../src/index.js";

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
