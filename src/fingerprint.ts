import { createHash } from "crypto";
import { readdirSync, readFileSync } from "fs";
import path from "path";

import { directorySource, fileSource } from "./sources.js";
import type {
  FingerprintArgs,
  FingerprintConfig,
  FingerprintContentSource,
  FingerprintDirectorySource,
  FingerprintFileSource,
  FingerprintHash,
  FingerprintSource,
  FingerprintSourceHash,
} from "./types.js";

const DEFAULT_HASH_ALGORITHM = "sha256";

export function calculateFingerprint(args: FingerprintArgs): FingerprintHash {
  const sourceHashes = args.sources.map((source) => hashSource(args, source));
  return mergeSourceHashes(args, sourceHashes);
}

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

export function hashContentSource(
  config: FingerprintConfig,
  source: FingerprintContentSource
): FingerprintSourceHash {
  return {
    source,
    hash: hashContent(config, source.content),
  };
}

export function hashFileSource(
  config: FingerprintConfig,
  source: FingerprintFileSource
): FingerprintSourceHash {
  const pathWithRoot = path.join(config.rootDir, source.path);
  const content = readFileSync(pathWithRoot, "utf8");
  return {
    source,
    hash: hashContent(config, content),
  };
}

export function hashDirectorySource(
  config: FingerprintConfig,
  source: FingerprintDirectorySource
): FingerprintSourceHash {
  const pathWithRoot = path.join(config.rootDir, source.path);
  const entries = readdirSync(pathWithRoot, { withFileTypes: true });
  const entryHashes = entries
    .map((entry) => {
      if (entry.isFile()) {
        const filePath = path.join(source.path, entry.name);
        return hashFileSource(config, fileSource(filePath));
      } else if (entry.isDirectory()) {
        const dirPath = path.join(source.path, entry.name);
        return hashDirectorySource(config, directorySource(dirPath));
      } else {
        console.warn(`fs-fingerprint: skipping ${entry.name} in ${source.path}`);
        return null;
      }
    })
    .filter((hash) => hash != null);

  const merged = mergeSourceHashes(config, entryHashes);
  return {
    source,
    hash: merged.hash,
    children: merged.sources,
  };
}

export function mergeSourceHashes(
  config: FingerprintConfig,
  hashes: FingerprintSourceHash[]
): FingerprintHash {
  const sortedHashes = hashes.sort((a, b) => {
    return a.source.key.localeCompare(b.source.key);
  });

  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  for (const sourceHash of sortedHashes) {
    hasher.update(sourceHash.source.key);
    hasher.update(sourceHash.hash);
  }

  return {
    hash: hasher.digest("hex"),
    sources: sortedHashes,
  };
}

function hashContent(config: FingerprintConfig, content: string) {
  const hasher = createHash(config.hashAlgorithm ?? DEFAULT_HASH_ALGORITHM);
  hasher.update(content);
  return hasher.digest("hex");
}
