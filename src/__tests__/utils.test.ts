import { createHash } from "node:crypto";
import { expect, test } from "vitest";

import { EMPTY_HASH } from "../constants.js";
import {
  type FingerprintConfig,
  type FingerprintFileHash,
  hashContent,
  mergeHashes,
} from "../index.js";

test("hashContent respects null hash algorithm", () => {
  const config: FingerprintConfig = {
    rootDir: "/does/not/matter",
    hashAlgorithm: "null",
  };

  const hash = hashContent("Hello, world!", config);
  expect(hash).toBe(EMPTY_HASH);
});

test("hashContent uses default hash algorithm if not specified", () => {
  const config: FingerprintConfig = {
    rootDir: "/does/not/matter",
  };

  const hash = hashContent("Hello, world!", config);
  const hashSha1 = createHash("sha1").update("Hello, world!").digest("hex");
  expect(hash).toBe(hashSha1);
});

test("mergeHashes respects null hash algorithm", () => {
  const config: FingerprintConfig = {
    rootDir: "/does/not/matter",
    hashAlgorithm: "null",
  };

  const fileInput: FingerprintFileHash = {
    key: "test",
    hash: "123",
    type: "file",
    path: "fake/path",
  };

  const result = mergeHashes([fileInput], config);
  expect(result).toEqual({
    hash: "(null)",
    inputs: [fileInput],
  });
});

test("mergeHashes uses default hash algorithm if not specified", () => {
  const config: FingerprintConfig = {
    rootDir: "/does/not/matter",
  };

  const fileInput: FingerprintFileHash = {
    key: "test",
    hash: "123",
    type: "file",
    path: "fake/path",
  };

  const result = mergeHashes([fileInput], config);
  const resultSha1 = mergeHashes([fileInput], { ...config, hashAlgorithm: "sha1" });
  expect(result).toEqual(resultSha1);
});
