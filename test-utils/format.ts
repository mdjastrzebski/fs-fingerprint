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

/**
 * Format a single fingerprint input entry as a single indented line.
 *
 * Returns "(null)\n" when `input` is null. For non-null inputs, the function
 * extracts the display name from `input.key` by taking the substring after the
 * first ":" (i.e. `input.key.split(":")[1]`) and returns a line of the form
 * `"${spaces}- {name} - {input.hash}\n"`, where `spaces` is `indent` spaces.
 *
 * Note: the function does not validate the format of `input.key`; if there is
 * no ":" the extracted name may be `undefined`.
 *
 * @param input - The fingerprint input object to format, or `null`.
 * @param indent - Number of leading spaces to prepend to the formatted line.
 * @returns A single formatted line ending with a newline.
 */
export function formatInputHash(input: FingerprintInputHash | null, indent = 0): string {
  if (input == null) {
    return "(null)\n";
  }

  const name = input.key.split(":")[1];
  return `${" ".repeat(indent)}- ${name} - ${input.hash}\n`;
}
