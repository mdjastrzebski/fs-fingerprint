import { beforeEach, describe, expect, test } from "bun:test";

import { createRootDir } from "../../test-utils/fs.js";
import type { ContentHash, FileHash } from "../types.js";
import {
  getInputFiles,
  getInputFilesSync,
  hashData,
  mergeHashes,
  mergePaths,
  partitionGitIgnores,
} from "../utils.js";

const baseConfig = {
  basePath: "not-used",
};

const { basePath, prepareRootDir, writePaths } = createRootDir("utils-test");

beforeEach(() => {
  prepareRootDir();
});

describe("hashContent", () => {
  test("handles basic case", () => {
    const hash = hashData("Hello, world!", baseConfig);
    expect(hash).toMatchInlineSnapshot(`"943a702d06f34599aee1f8da8ef9f7296031d699"`);
  });

  test("handles null algorithm", () => {
    const hash = hashData("Hello, world!", { ...baseConfig, hashAlgorithm: "null" });
    expect(hash).toEqual("(null)");
  });
});

const PATHS_TXT = ["file1.txt", "dir/file2.txt", "dir/subdir/file3.txt"].sort();
const PATHS_MD = ["file1.md", "dir/file2.md", "dir/subdir/file3.md"].sort();

describe("getFilesToHash", () => {
  test('returns all files when "files" is not specified', async () => {
    writePaths(PATHS_TXT);

    const result = await getInputFiles(basePath, {});
    expect(result).toEqual(PATHS_TXT);

    const resultSync = getInputFilesSync(basePath, {});
    expect(resultSync).toEqual(result);
  });

  test('returns empty array when "files" is empty', async () => {
    writePaths(PATHS_TXT);

    const result = await getInputFiles(basePath, { files: [] });
    expect(result).toEqual([]);

    const resultSync = getInputFilesSync(basePath, { files: [] });
    expect(resultSync).toEqual([]);
  });

  test("returns files matching exact filename", async () => {
    writePaths(PATHS_TXT);

    const result1 = await getInputFiles(basePath, { files: ["file1.txt"] });
    expect(result1).toEqual(["file1.txt"]);
    const resultSync1 = getInputFilesSync(basePath, { files: ["file1.txt"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await getInputFiles(basePath, {
      files: ["file1.txt", "dir/file2.txt"],
    });
    expect(result2).toEqual(["dir/file2.txt", "file1.txt"]);
    const resultSync2 = getInputFilesSync(basePath, {
      files: ["file1.txt", "dir/file2.txt"],
    });
    expect(resultSync2).toEqual(result2);

    const result3 = await getInputFiles(basePath, { files: ["dir/subdir/file3.txt"] });
    expect(result3).toEqual(["dir/subdir/file3.txt"]);
    const resultSync3 = getInputFilesSync(basePath, { files: ["dir/subdir/file3.txt"] });
    expect(resultSync3).toEqual(result3);
  });

  test("returns files matching glob patterns", async () => {
    writePaths(PATHS_TXT);

    const result1 = await getInputFiles(basePath, { files: ["*.txt"] });
    expect(result1).toEqual(["file1.txt"]);
    const resultSync1 = getInputFilesSync(basePath, { files: ["*.txt"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await getInputFiles(basePath, { files: ["**/*.txt"] });
    expect(result2).toEqual(PATHS_TXT);
    const resultSync2 = getInputFilesSync(basePath, { files: ["**/*.txt"] });
    expect(resultSync2).toEqual(result2);
  });

  test("returns includes directories & their contents", async () => {
    writePaths(PATHS_TXT);

    const result1 = await getInputFiles(basePath, { files: ["dir/**"] });
    expect(result1).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync1 = getInputFilesSync(basePath, { files: ["dir/**"] });
    expect(resultSync1).toEqual(result1);

    const result2 = await getInputFiles(basePath, { files: ["dir"] });
    expect(result2).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync2 = getInputFilesSync(basePath, { files: ["dir"] });
    expect(resultSync2).toEqual(result2);

    const result3 = await getInputFiles(basePath, { files: ["dir/"] });
    expect(result3).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
    const resultSync3 = getInputFilesSync(basePath, { files: ["dir/"] });
    expect(resultSync3).toEqual(result3);
  });

  test('returns supports "ignores"', async () => {
    writePaths([...PATHS_TXT, ...PATHS_MD]);

    const result1 = await getInputFiles(basePath, { ignores: ["**/*.md"] });
    expect(result1).toEqual(PATHS_TXT);

    const resultSync1 = getInputFilesSync(basePath, { ignores: ["**/*.md"] });
    expect(resultSync1).toEqual(result1);
  });
});

describe("getFilesToHash dotfiles", () => {
  const PATHS_DOT = [".env", ".github/workflows/ci.yml", "dir/.eslintrc", "dir/.hidden/file.ts"];

  test("includes dotfiles and dot-directories at any depth", async () => {
    writePaths([...PATHS_TXT, ...PATHS_DOT]);

    const result = await getInputFiles(basePath, {});
    expect(result).toEqual([...PATHS_TXT, ...PATHS_DOT].sort());

    const resultSync = getInputFilesSync(basePath, {});
    expect(resultSync).toEqual(result);
  });

  test("includes dotfiles when expanding a directory pattern", async () => {
    writePaths([...PATHS_TXT, ...PATHS_DOT]);

    const result = await getInputFiles(basePath, { files: ["dir"] });
    expect(result).toEqual([
      "dir/.eslintrc",
      "dir/.hidden/file.ts",
      "dir/file2.txt",
      "dir/subdir/file3.txt",
    ]);

    const resultSync = getInputFilesSync(basePath, { files: ["dir"] });
    expect(resultSync).toEqual(result);
  });

  test("excludes dotfiles matched by ignores", async () => {
    writePaths([...PATHS_TXT, ...PATHS_DOT]);

    const result = await getInputFiles(basePath, { ignores: ["**/.*"] });
    expect(result).toEqual(PATHS_TXT);

    const resultSync = getInputFilesSync(basePath, { ignores: ["**/.*"] });
    expect(resultSync).toEqual(result);
  });

  test("excludes .git directories and files at any depth", async () => {
    writePaths([
      ...PATHS_TXT,
      ".git/HEAD",
      ".git/objects/ab/cdef",
      "dir/submodule/.git",
      "dir/nested-repo/.git/HEAD",
      ".gitignore",
    ]);

    const result = await getInputFiles(basePath, {});
    expect(result).toEqual([...PATHS_TXT, ".gitignore"].sort());

    const resultSync = getInputFilesSync(basePath, {});
    expect(resultSync).toEqual(result);
  });

  test("excludes .git directories when files are outside basePath", async () => {
    writePaths(["project/file.txt", "other/file.txt", "other/.env", "other/.git/HEAD"]);
    const projectPath = `${basePath}/project`;

    const result = await getInputFiles(projectPath, { files: ["../other", "**"] });
    expect(result).toEqual(["../other/.env", "../other/file.txt", "file.txt"]);

    const resultSync = getInputFilesSync(projectPath, { files: ["../other", "**"] });
    expect(resultSync).toEqual(result);
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

describe("mergePaths", () => {
  test("merges, de-duplicates and sorts paths", () => {
    expect(
      mergePaths([
        ["b", "d"],
        ["a", "b", "c"],
      ]),
    ).toEqual(["a", "b", "c", "d"]);
  });
});

describe("partitionGitIgnores", () => {
  const gitIgnores = ["../../root/", ".env.local", "dist/", "ios/Pods/", "node_modules/"];

  test("picks literal paths equal to or inside git-ignored entries", () => {
    expect(
      partitionGitIgnores(
        ["node_modules/pkg-a/", "./ios/Pods", ".env.local", "../../root/file.txt"],
        gitIgnores,
      ),
    ).toEqual({
      explicitFiles: ["node_modules/pkg-a/", "./ios/Pods", ".env.local", "../../root/file.txt"],
      remainingGitIgnores: ["dist/"],
    });
  });

  test("skips glob patterns", () => {
    expect(partitionGitIgnores(["**", "node_modules/*-a/", "dist/**"], gitIgnores)).toEqual({
      explicitFiles: [],
      remainingGitIgnores: gitIgnores,
    });
  });

  test("skips literal paths that only contain git-ignored entries", () => {
    expect(partitionGitIgnores(["ios/", "node_modules-extra/file.txt"], gitIgnores)).toEqual({
      explicitFiles: [],
      remainingGitIgnores: gitIgnores,
    });
  });

  test("handles no files", () => {
    expect(partitionGitIgnores(undefined, gitIgnores)).toEqual({
      explicitFiles: [],
      remainingGitIgnores: gitIgnores,
    });
  });
});
