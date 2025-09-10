import fs from "node:fs";
import picomatch from "picomatch";
import { beforeEach, expect, test } from "vitest";

import { createRootDir } from "../../../test-utils/fs.js";
import { EMPTY_HASH } from "../../constants.js";
import type { FingerprintConfig } from "../../types.js";
import { calculateFileHash, calculateFileHashSync } from "../file.js";

const { rootDir, writeFile } = createRootDir("file-test");

const baseConfig: FingerprintConfig = {
  rootDir,
  hashAlgorithm: "sha1",
};

beforeEach(() => {
  if (fs.existsSync(baseConfig.rootDir)) {
    fs.rmSync(baseConfig.rootDir, { recursive: true });
  }

  fs.mkdirSync(baseConfig.rootDir, { recursive: true });
});

test("calculateFileHash handles regular file", async () => {
  writeFile("file-1.txt", "Hello, world!");

  const hash = await calculateFileHash("file-1.txt", baseConfig);
  expect(hash).toEqual({
    hash: "943a702d06f34599aee1f8da8ef9f7296031d699",
    key: "file:file-1.txt",
    path: "file-1.txt",
    type: "file",
  });

  const hashSync = calculateFileHashSync("file-1.txt", baseConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateFileHash rejects trailing slash", async () => {
  writeFile("file-1.txt", "Hello, world!");

  await expect(() => calculateFileHash("file-1.txt/", baseConfig)).rejects.toThrow();
  expect(() => calculateFileHashSync("file-1.txt/", baseConfig)).toThrow();
});

test("calculateFileHash ignores excluded paths", async () => {
  writeFile("file-1.txt", "Hello, world!");

  const testConfig = { ...baseConfig, exclude: [picomatch("file-1.txt")] };
  const hash = await calculateFileHash("file-1.txt", testConfig, { skipInitialExclude: true });
  expect(hash).toEqual({
    hash: "943a702d06f34599aee1f8da8ef9f7296031d699",
    key: "file:file-1.txt",
    path: "file-1.txt",
    type: "file",
  });

  const hashSync = calculateFileHashSync("file-1.txt", testConfig, { skipInitialExclude: true });
  expect(hashSync).toEqual(hash);
});

test("calculateFileHash handles null hash algorithm", async () => {
  writeFile("file-1.txt", "Hello, world!");

  const testConfig = { ...baseConfig, hashAlgorithm: "null" };
  const hash = await calculateFileHash("file-1.txt", testConfig);
  expect(hash).toEqual({
    hash: EMPTY_HASH,
    key: "file:file-1.txt",
    path: "file-1.txt",
    type: "file",
  });

  const hashSync = calculateFileHashSync("file-1.txt", testConfig);
  expect(hashSync).toEqual(hash);
});
