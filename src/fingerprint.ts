import { hashSource } from "./sources/index.js";
import type { FingerprintArgs, FingerprintHash } from "./types.js";
import { mergeSourceHashes } from "./utils.js";

export function calculateFingerprint(args: FingerprintArgs): FingerprintHash {
  const sourceHashes = args.sources.map((source) => hashSource(args, source));
  return mergeSourceHashes(args, sourceHashes);
}
