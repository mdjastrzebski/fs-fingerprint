import type { FingerprintConfig, FingerprintSource, FingerprintSourceHash } from "../types.js";
import { hashContentSource } from "./content.js";
import { hashDirectorySource } from "./directory.js";
import { hashFileSource } from "./file.js";

const hashFunction = {
  content: hashContentSource,
  file: hashFileSource,
  directory: hashDirectorySource,
};

export function hashSource(
  config: FingerprintConfig,
  source: FingerprintSource
): FingerprintSourceHash {
  // @ts-expect-error Type 'FingerprintContentSource' is not assignable to type 'never'.
  return hashFunction[source.type](config, source);
}
