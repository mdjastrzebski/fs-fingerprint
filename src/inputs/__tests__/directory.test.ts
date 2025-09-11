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
    "- DIRECTORY dir-1/ - 4cdd75d081e0a12bd13d8835fb9fab98390d2c7b
        - DIRECTORY nested/ - 1ef4c4598129087db58c2fc98410e6735d610700
            - FILE file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - FILE file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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
    "- DIRECTORY nested/ - 764b2647b41ffe8b2d268aff8633a0517dbbeb35
        - FILE file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  const hashSync = calculateDirectoryHashSync("dir-1/nested", baseConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateDirectoryHash handles excluded paths for paths", async () => {
  writePaths([
    "dir-1/file-1.txt",
    "dir-1/file-2.md",
    "dir-1/nested/file-3.txt",
    "dir-1/nested/file-4.md",
  ]);

  const testConfig = { ...baseConfig, exclude: [picomatch("**/*.md")] };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(formatInputHash(hash)).toMatchInlineSnapshot(`
    "- DIRECTORY dir-1/ - 226cbbb7a92e81b1b2bafa80031da69dd5341ba0
        - DIRECTORY nested/ - 1ef4c4598129087db58c2fc98410e6735d610700
            - FILE file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(findInput(hash?.children, "file-1.txt")).toBeTruthy();
  expect(findInput(hash?.children, "nested/file-3.txt")).toBeTruthy();
  expect(findInput(hash?.children, "file-2.md")).toBeNull();
  expect(findInput(hash?.children, "nested/file-4.md")).toBeNull();

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateDirectoryHash handles excluded paths for directory", async () => {
  writePaths(["dir-1/file-1.txt", "dir-1/nested/file-2.txt", "dir-1/nested/deep/file-3.txt"]);

  const testConfig = { ...baseConfig, exclude: [picomatch("dir-1/nested")] };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(formatInputHash(hash)).toMatchInlineSnapshot(`
    "- DIRECTORY dir-1/ - 2ce538e6c47ab19463715ed648a3f6a27ec96a33
        - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(findInput(hash?.children, "file-1.txt")).toBeTruthy();
  expect(findInput(hash?.children, "nested/file-2.txt")).toBeNull();
  expect(findInput(hash?.children, "nested/deep/file-3.txt")).toBeNull();

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateDirectoryHash handles null hash algorithm", async () => {
  writePaths(["dir-1/file-1.txt", "dir-1/nested/file-2.txt"]);

  const testConfig = { ...baseConfig, hashAlgorithm: "null" };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(formatInputHash(hash)).toMatchInlineSnapshot(`
    "- DIRECTORY dir-1/ - (null)
        - DIRECTORY nested/ - (null)
            - FILE file-2.txt - (null)
        - FILE file-1.txt - (null)
    "
  `);

  expect(findInput(hash?.children, "file-1.txt")?.hash).toBe("(null)");
  expect(findInput(hash?.children, "nested/")?.hash).toBe("(null)");
  expect(findInput(hash?.children, "nested/file-2.txt")?.hash).toBe("(null)");

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toEqual(hash);
});

test("calculateDirectoryHash for empty directory returns null", async () => {
  writePaths(["dir-1/"]);

  const testConfig = { ...baseConfig };
  const hash = await calculateDirectoryHash("dir-1", testConfig);
  expect(hash).toBeNull();

  const hashSync = calculateDirectoryHashSync("dir-1", testConfig);
  expect(hashSync).toBeNull();
});

test("calculateDirectoryHash for directory with all excluded files returns null", async () => {
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
