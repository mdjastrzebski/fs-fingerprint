import { beforeEach, describe, expect, test } from "bun:test";

import { createRootDir } from "../../test-utils/fs.js";
import { generateFileList, hashContent } from "../utils.js";

const baseConfig = {
  rootDir: "not-used",
};

const { rootDir, prepareRootDir, writePaths } = createRootDir("utils-test");

beforeEach(() => {
  prepareRootDir();
});

test("hashContent handles base case", () => {
  const hash = hashContent("Hello, world!", baseConfig);
  expect(hash).toMatchInlineSnapshot(`"943a702d06f34599aee1f8da8ef9f7296031d699"`);
});

test("hashContent handle null algorithm", () => {
  const hash = hashContent("Hello, world!", { ...baseConfig, hashAlgorithm: "null" });
  expect(hash).toEqual("(null)");
});

const PATHS_TXT = ["file1.txt", "dir/file2.txt", "dir/subdir/file3.txt"];
const PATHS_MD = ["file1.md", "dir/file2.md", "dir/subdir/file3.md"];

describe("generateFileList", () => {
  test("returns all files when include is not specified", () => {
    writePaths(PATHS_TXT);

    const result = generateFileList({ rootDir });
    expect(result).toEqual(PATHS_TXT.sort());
  });

  test("returns empty array when include is empty", () => {
    writePaths(PATHS_TXT);

    const result = generateFileList({ rootDir, include: [] });
    expect(result).toEqual([]);
  });

  test("returns files matching exact filename", () => {
    writePaths(PATHS_TXT);

    const result1 = generateFileList({ rootDir, include: ["file1.txt"] });
    expect(result1).toEqual(["file1.txt"]);

    const result2 = generateFileList({ rootDir, include: ["file1.txt", "dir/file2.txt"] });
    expect(result2).toEqual(["dir/file2.txt", "file1.txt"]);

    const result3 = generateFileList({ rootDir, include: ["dir/subdir/file3.txt"] });
    expect(result3).toEqual(["dir/subdir/file3.txt"]);
  });

  test("returns files matching glob patterns", () => {
    writePaths(PATHS_TXT);

    const result1 = generateFileList({ rootDir, include: ["*.txt"] });
    expect(result1).toEqual(["file1.txt"]);

    const result2 = generateFileList({ rootDir, include: ["**/*.txt"] });
    expect(result2).toEqual(PATHS_TXT.sort());
  });

  test("returns includes directories & their contents", () => {
    writePaths(PATHS_TXT);

    const result1 = generateFileList({ rootDir, include: ["dir/**"] });
    expect(result1).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);

    const result2 = generateFileList({ rootDir, include: ["dir"] });
    expect(result2).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);

    const result3 = generateFileList({ rootDir, include: ["dir/"] });
    expect(result3).toEqual(["dir/file2.txt", "dir/subdir/file3.txt"]);
  });

  test("returns supports exclude", () => {
    writePaths([...PATHS_TXT, ...PATHS_MD]);

    const result1 = generateFileList({ rootDir, exclude: ["**/*.md"] });
    expect(result1).toEqual(PATHS_TXT.sort());
  });

  test("returns supports excludeFn", () => {
    writePaths([...PATHS_TXT, ...PATHS_MD]);

    const result1 = generateFileList({ rootDir, excludeFn: (path) => path.endsWith(".md") });
    expect(result1).toEqual(PATHS_TXT.sort());
  });
});
