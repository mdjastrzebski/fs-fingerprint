import { beforeEach, describe, expect, test } from "bun:test";

import { createRootDir } from "../../../test-utils/fs.js";
import { EMPTY_HASH } from "../../constants.js";
import type { FingerprintConfig } from "../../types.js";
import { calculateFileHash, calculateFileHashSync } from "../file.js";

const { rootDir, prepareRootDir, writeFile } = createRootDir("file-test");

const baseConfig: FingerprintConfig = {
  rootDir,
  hashAlgorithm: "sha1",
};

beforeEach(() => {
  prepareRootDir();
});

describe("calculateFileHash", () => {
  test("handles regular file", async () => {
    writeFile("file-1.txt", "Hello, world!");

    const hash = await calculateFileHash("file-1.txt", baseConfig);
    expect(hash).toEqual({
      hash: "943a702d06f34599aee1f8da8ef9f7296031d699",
      path: "file-1.txt",
    });

    const hashSync = calculateFileHashSync("file-1.txt", baseConfig);
    expect(hashSync).toEqual(hash);
  });

  test("rejects trailing slash", async () => {
    writeFile("file-1.txt", "Hello, world!");

    expect(() => calculateFileHash("file-1.txt/", baseConfig)).toThrow();
    expect(() => calculateFileHashSync("file-1.txt/", baseConfig)).toThrow();
  });

  test("handles null hash algorithm", async () => {
    writeFile("file-1.txt", "Hello, world!");

    const testConfig = { ...baseConfig, hashAlgorithm: "null" };
    const hash = await calculateFileHash("file-1.txt", testConfig);
    expect(hash).toEqual({
      hash: EMPTY_HASH,
      path: "file-1.txt",
    });

    const hashSync = calculateFileHashSync("file-1.txt", testConfig);
    expect(hashSync).toEqual(hash);
  });
});
