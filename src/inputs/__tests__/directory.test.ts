import fs from "node:fs";
import path from "node:path";
import picomatch from "picomatch";
import { beforeEach, expect, test, vi } from "vitest";

import { findInput } from "../../../test-utils/assert.js";
import { formatInputHash } from "../../../test-utils/format.js";
import { createRootDir } from "../../../test-utils/fs.js";
import type { FingerprintConfig } from "../../types.js";
import { calculateDirectoryHash, calculateDirectoryHashSync } from "../directory.js";

const { rootDir, writePaths } = createRootDir("directory-test");

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

test("calculateDirectoryHash handles simple directories", async () => {
  writePaths(["dir-1/file-1.txt", "dir-1/file-2.txt", "dir-1/nested/file-3.txt"]);

  const hash = await calculateDirectoryHash("dir-1", baseConfig);
  expect(formatInputHash(hash)).toMatchInlineSnapshot(`
    "- DIRECTORY dir-1/ - d4f76289c3ff8e8b39590c141d58aeda93949f7e
        - DIRECTORY dir-1/nested/ - 62fe0d525004f43af63e81f57ab5d29d113b50ca
            - FILE dir-1/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - FILE dir-1/file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - FILE dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  const hashSync = calculateDirectoryHashSync("dir-1", baseConfig);
  expect(hashSync).toEqual(hash);

  const hashWithSlash = await calculateDirectoryHash("dir-1/", baseConfig);
  expect(hashWithSlash).toEqual(hash);

  const hashWithSlashSync = calculateDirectoryHashSync("dir-1/", baseConfig);
  expect(hashWithSlashSync).toEqual(hash);
});

test("calculateDirectoryHash handles nested directories", async () => {
  writePaths(["dir-1/file-1.txt", "dir-1/nested/file-2.txt"]);

  const hash = await calculateDirectoryHash("dir-1/nested", baseConfig);
  expect(formatInputHash(hash)).toMatchInlineSnapshot(`
    "- DIRECTORY dir-1/nested/ - ce82d7d635ce824328f5e3e3ebeec52a585dd603
        - FILE dir-1/nested/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  const hashSync = calculateDirectoryHashSync("dir-1/nested", baseConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateFileHash handles excluded paths for paths", async () => {
  writePaths([
    "dir-1/file-1.txt",
    "dir-1/file-2.md",
    "dir-1/nested/file-3.txt",
    "dir-1/nested/file-4.md",
  ]);

  const testConfig = { ...baseConfig, exclude: [picomatch("**/*.md")] };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(formatInputHash(hash)).toMatchInlineSnapshot(`
    "- DIRECTORY dir-1/ - 8f268dc4752a3eceddaa01612b17b9e4c1f2c7f6
        - DIRECTORY dir-1/nested/ - 62fe0d525004f43af63e81f57ab5d29d113b50ca
            - FILE dir-1/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - FILE dir-1/file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(findInput(hash?.children, "dir-1/file-1.txt")).toBeTruthy();
  expect(findInput(hash?.children, "dir-1/nested/file-3.txt")).toBeTruthy();
  expect(findInput(hash?.children, "dir-1/file-2.md")).toBeNull();
  expect(findInput(hash?.children, "dir-1/nested/file-4.md")).toBeNull();

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateFileHash handles excluded paths for directory", async () => {
  writePaths(["dir-1/file-1.txt", "dir-1/nested/file-2.txt", "dir-1/nested/deep/file-3.txt"]);

  const testConfig = { ...baseConfig, exclude: [picomatch("dir-1/nested")] };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(formatInputHash(hash)).toMatchInlineSnapshot(`
    "- DIRECTORY dir-1/ - bc07f522c8d0fdc1bb6e0eaf2eb33b09ece6ce6d
        - FILE dir-1/file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(findInput(hash?.children, "dir-1/file-1.txt")).toBeTruthy();
  expect(findInput(hash?.children, "dir-1/nested/file-2.txt")).toBeNull();
  expect(findInput(hash?.children, "dir-1/nested/deep/file-3.txt")).toBeNull();

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateFileHash handles null hash algorithm", async () => {
  writePaths(["dir-1/file-1.txt", "dir-1/nested/file-2.txt"]);

  const testConfig = { ...baseConfig, hashAlgorithm: "null" };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(formatInputHash(hash)).toMatchInlineSnapshot(`
    "- DIRECTORY dir-1/ - (null)
        - DIRECTORY dir-1/nested/ - (null)
            - FILE dir-1/nested/file-2.txt - (null)
        - FILE dir-1/file-1.txt - (null)
    "
  `);

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateFileHash for empty directory returns null", async () => {
  writePaths(["dir-1/"]);

  const testConfig = { ...baseConfig };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(hash).toBeNull();

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toBeNull();
});

test("calculateFileHash for directory with all excluded files returns null", async () => {
  writePaths(["dir-1/file-1.txt", "dir-1/nested/file-2.txt"]);

  const testConfig = { ...baseConfig, exclude: [picomatch("**/*.txt")] };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(hash).toBeNull();

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toBeNull();
});

test("calculateDirectoryHash warns for non-file/non-directory entries", async () => {
  writePaths(["dir-1/"]);
  fs.symlinkSync("/dev/null", path.join(rootDir, "dir-1", "dev-null-link"));

  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  await calculateDirectoryHash("dir-1", baseConfig);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    'fs-fingerprint: skipping "dir-1/dev-null-link" (not a file or directory)',
  );

  consoleWarnSpy.mockClear();
  calculateDirectoryHashSync("dir-1", baseConfig);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    'fs-fingerprint: skipping "dir-1/dev-null-link" (not a file or directory)',
  );
});
