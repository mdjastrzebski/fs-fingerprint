import type {
  FingerprintConfig,
  FingerprintContentSource,
  FingerprintSourceHash,
} from "../types.js";
import { hashContent } from "../utils.js";

export function contentSource(key: string, content: string): FingerprintContentSource {
  return {
    type: "content",
    key: `content:${key}`,
    content,
  };
}

export function hashContentSource(
  config: FingerprintConfig,
  source: FingerprintContentSource
): FingerprintSourceHash {
  return {
    source,
    hash: hashContent(config, source.content),
  };
}
