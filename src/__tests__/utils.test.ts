import { beforeEach, describe, expect, test } from "bun:test";

import { createRootDir } from "../../test-utils/fs.js";
import type { FingerprintInputHash } from "../types.js";
import { generateFileList, generateFileListSync, hashContent, mergeHashes } from "../utils.js";

const baseConfig = {
  rootDir: "not-used",
};

const { rootDir, prepareRootDir, writePaths } = createRootDir("utils-test");

beforeEach(() => {
  prepareRootDir();
});

describe("hashContent", () => {
  test("handles basic case", () => {
    const hash = hashContent("Hello, world!", baseConfig);
    expect(hash).toMatchInlineSnapshot(`"943a702d06f34599aee1f8da8ef9f7296031d699"`);
  });

  test("handles null algorithm", () => {
    const hash = hashContent("Hello, world!", { ...baseConfig, hashAlgorithm: "null" });
    expect(hash).toEqual("(null)");
  });
});

const PATHS_TXT = ["file1.txt", "dir/file2.txt", "dir/subdir/file3.txt"];
const PATHS_MD = ["file1.md", "dir/file2.md", "dir/subdir/file3.md"];

describe("generateFileList", () => {
  test("returns all files when include is not specified", async () => {
    writePaths(PATHS_TXT);

    const result = await generateFileList({ rootDir });
    expect(result).toEqual(PATHS_TXT.sort());

    const resultSync = generateFileListSync({ rootDir });
    expect(resultSync).toEqual(result);
  });

  test("returns empty array when include is empty", async () => {
    writePaths(PATHS_TXT);

    const result = await generateFileList({ rootDir, include: [] });
    expect(result).toEqual([]);

    const resultSync = generateFileListSync({ rootDir, include: [] });
    expect(resultSync).toEqual([]);
  });

  test("returns files matching exact filename", async () => {
    writePaths(PATHS_TXT);

    const result1 = await generateFileList({ rootDir, include: ["file1.txt"] });
    expect(result1).toEqual(["file1.txt"]);
    const resultSync1 = generateFileListSync({ rootDir, include: ["file1.txt"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await generateFileList({ rootDir, include: ["file1.txt", "dir/file2.txt"] });
    expect(result2).toEqual(["dir/file2.txt", "file1.txt"]);
    const resultSync2 = generateFileListSync({ rootDir, include: ["file1.txt", "dir/file2.txt"] });
    expect(resultSync2).toEqual(result2);

    const result3 = await generateFileList({ rootDir, include: ["dir/subdir/file3.txt"] });
    expect(result3).toEqual(["dir/subdir/file3.txt"]);
    const resultSync3 = generateFileListSync({ rootDir, include: ["dir/subdir/file3.txt"] });
    expect(resultSync3).toEqual(result3);
  });

  test("returns files matching glob patterns", async () => {
    writePaths(PATHS_TXT);

    const result1 = await generateFileList({ rootDir, include: ["*.txt"] });
    expect(result1).toEqual(["file1.txt"]);
    const resultSync1 = generateFileListSync({ rootDir, include: ["*.txt"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await generateFileList({ rootDir, include: ["**/*.txt"] });
    expect(result2).toEqual(PATHS_TXT.sort());
    const resultSync2 = generateFileListSync({ rootDir, include: ["**/*.txt"] });
    expect(resultSync2).toEqual(result2);
  });

  test("returns includes directories & their contents", async () => {
    writePaths(PATHS_TXT);

    const result1 = await generateFileList({ rootDir, include: ["dir/**"] });
    expect(result1).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync1 = generateFileListSync({ rootDir, include: ["dir/**"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await generateFileList({ rootDir, include: ["dir"] });
    expect(result2).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync2 = generateFileListSync({ rootDir, include: ["dir"] });
    expect(resultSync2).toEqual(result2);

    const result3 = await generateFileList({ rootDir, include: ["dir/"] });
    expect(result3).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync3 = generateFileListSync({ rootDir, include: ["dir/"] });
    expect(resultSync3).toEqual(result3);
  });

  test("returns supports exclude", async () => {
    writePaths([...PATHS_TXT, ...PATHS_MD]);

    const result1 = await generateFileList({ rootDir, exclude: ["**/*.md"] });
    expect(result1).toEqual(PATHS_TXT.sort());

    const resultSync1 = generateFileListSync({ rootDir, exclude: ["**/*.md"] });
    expect(resultSync1).toEqual(result1);
  });
});

describe("mergeHashes", () => {
  test("supports basic case", () => {
    const inputs: FingerprintInputHash[] = [
      { key: "a", hash: "hash-a", type: "file", path: "a" },
      { key: "b", hash: "hash-b", type: "file", path: "b" },
      { key: "c", hash: "hash-c", type: "file", path: "c" },
    ];
    const result = mergeHashes(inputs, baseConfig);
    expect(result).toEqual({
      hash: "f0e3d0fa0c0cd3f1a679754b1c44e7fdb426922f",
      inputs,
    });
  });

  test("returns null when input is empty", () => {
    const result = mergeHashes([], baseConfig);
    expect(result).toBeNull();
  });
});
