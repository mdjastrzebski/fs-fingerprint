import { beforeEach, describe, expect, test } from "bun:test";

import { createRootDir } from "../../test-utils/fs.js";
import type { ContentHash, FileHash } from "../types.js";
import { getInputFiles, getInputFilesSync, hashContent, mergeHashes } from "../utils.js";

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

const PATHS_TXT = ["file1.txt", "dir/file2.txt", "dir/subdir/file3.txt"].sort();
const PATHS_MD = ["file1.md", "dir/file2.md", "dir/subdir/file3.md"].sort();

describe("getFilesToHash", () => {
  test("returns all files when include is not specified", async () => {
    writePaths(PATHS_TXT);

    const result = await getInputFiles({ rootDir });
    expect(result).toEqual(PATHS_TXT);

    const resultSync = getInputFilesSync({ rootDir });
    expect(resultSync).toEqual(result);
  });

  test("returns empty array when include is empty", async () => {
    writePaths(PATHS_TXT);

    const result = await getInputFiles({ rootDir, include: [] });
    expect(result).toEqual([]);

    const resultSync = getInputFilesSync({ rootDir, include: [] });
    expect(resultSync).toEqual([]);
  });

  test("returns files matching exact filename", async () => {
    writePaths(PATHS_TXT);

    const result1 = await getInputFiles({ rootDir, include: ["file1.txt"] });
    expect(result1).toEqual(["file1.txt"]);
    const resultSync1 = getInputFilesSync({ rootDir, include: ["file1.txt"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await getInputFiles({ rootDir, include: ["file1.txt", "dir/file2.txt"] });
    expect(result2).toEqual(["dir/file2.txt", "file1.txt"]);
    const resultSync2 = getInputFilesSync({ rootDir, include: ["file1.txt", "dir/file2.txt"] });
    expect(resultSync2).toEqual(result2);

    const result3 = await getInputFiles({ rootDir, include: ["dir/subdir/file3.txt"] });
    expect(result3).toEqual(["dir/subdir/file3.txt"]);
    const resultSync3 = getInputFilesSync({ rootDir, include: ["dir/subdir/file3.txt"] });
    expect(resultSync3).toEqual(result3);
  });

  test("returns files matching glob patterns", async () => {
    writePaths(PATHS_TXT);

    const result1 = await getInputFiles({ rootDir, include: ["*.txt"] });
    expect(result1).toEqual(["file1.txt"]);
    const resultSync1 = getInputFilesSync({ rootDir, include: ["*.txt"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await getInputFiles({ rootDir, include: ["**/*.txt"] });
    expect(result2).toEqual(PATHS_TXT);
    const resultSync2 = getInputFilesSync({ rootDir, include: ["**/*.txt"] });
    expect(resultSync2).toEqual(result2);
  });

  test("returns includes directories & their contents", async () => {
    writePaths(PATHS_TXT);

    const result1 = await getInputFiles({ rootDir, include: ["dir/**"] });
    expect(result1).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync1 = getInputFilesSync({ rootDir, include: ["dir/**"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await getInputFiles({ rootDir, include: ["dir"] });
    expect(result2).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync2 = getInputFilesSync({ rootDir, include: ["dir"] });
    expect(resultSync2).toEqual(result2);

    const result3 = await getInputFiles({ rootDir, include: ["dir/"] });
    expect(result3).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync3 = getInputFilesSync({ rootDir, include: ["dir/"] });
    expect(resultSync3).toEqual(result3);
  });

  test("returns supports exclude", async () => {
    writePaths([...PATHS_TXT, ...PATHS_MD]);

    const result1 = await getInputFiles({ rootDir, exclude: ["**/*.md"] });
    expect(result1).toEqual(PATHS_TXT);

    const resultSync1 = getInputFilesSync({ rootDir, exclude: ["**/*.md"] });
    expect(resultSync1).toEqual(result1);
  });
});

describe("mergeHashes", () => {
  test("supports basic case", () => {
    const files: FileHash[] = [
      { path: "a", hash: "hash-a" },
      { path: "b", hash: "hash-b" },
      { path: "c", hash: "hash-c" },
    ];
    const content: ContentHash[] = [
      { key: "input-a", hash: "hash-input-a", content: "a" },
      { key: "input-b", hash: "hash-input-b", content: "b" },
    ];

    const result = mergeHashes(files, content, baseConfig);
    expect(result).toEqual({
      hash: "8a1f3072c02af07a9daeba4df2230fa541e8479e",
      files,
      content,
    });
  });
});
