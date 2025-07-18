import type { FingerprintConfig, FingerprintContentInput, FingerprintInputHash } from "../types.js";
import { hashContent } from "../utils.js";

export function contentInput(key: string, content: string): FingerprintContentInput {
  return {
    type: "content",
    key: `content:${key}`,
    content,
  };
}

export function hashContentInput(
  config: FingerprintConfig,
  input: FingerprintContentInput
): FingerprintInputHash {
  return {
    ...input,
    hash: hashContent(config, input.content),
  };
}
