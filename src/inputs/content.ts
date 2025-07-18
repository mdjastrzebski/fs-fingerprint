import type { FingerprintConfig, FingerprintContentInput, FingerprintInputHash } from "../types.js";
import { hashContent } from "../utils.js";

export function calculateContentHash(
  input: FingerprintContentInput,
  config: FingerprintConfig
): FingerprintInputHash {
  return {
    type: "content",
    key: `content:${input.key}`,
    hash: hashContent(config, input.content),
    content: input.content,
  };
}
