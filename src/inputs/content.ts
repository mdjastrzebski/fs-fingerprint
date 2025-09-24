import type { DataHash, FingerprintConfig, FingerprintContentInput } from "../types.js";
import { hashContent } from "../utils.js";

export function calculateContentHash(
  input: FingerprintContentInput,
  config: FingerprintConfig,
): DataHash {
  return {
    key: input.key,
    hash: hashContent(input.content, config),
    data: input.content,
  };
}
