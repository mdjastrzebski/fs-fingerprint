import { execSync } from "node:child_process";
import * as path from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";

import { createRootDir } from "../../test-utils/fs.js";
import { getGitIgnoredPaths, remapPaths } from "../git.js";

const { rootDir, prepareRootDir, writePaths, writeFile } = createRootDir("git-test");

beforeEach(() => {
  prepareRootDir();
});

const PATHS_TXT = ["file1.txt", "dir/file2.txt", "dir/subdir/file3.txt"];
const PATHS_MD = ["file1.md", "dir/file2.md", "dir/subdir/file3.md"];

describe("getGitIgnoredPaths", () => {
  test("supports basic case", () => {
    writePaths(PATHS_TXT);
    writePaths(PATHS_MD);

    writeFile(".gitignore", "*.md\ndir/subdir/");
    writeFile("dir/.gitignore", "file2.txt");

    execSync("git init", {
      cwd: rootDir,
    });

    const ignoredFiles = getGitIgnoredPaths(rootDir);
    expect(ignoredFiles).toMatchInlineSnapshot(`
      [
        "dir/file2.md",
        "dir/file2.txt",
        "dir/subdir/",
        "file1.md",
      ]
    `);

    expect(ignoredFiles).toContain("file1.md");
    expect(ignoredFiles).toContain("dir/file2.md");
    expect(ignoredFiles).toContain("dir/file2.txt");
    expect(ignoredFiles).toContain("dir/subdir/");
    expect(ignoredFiles).not.toContain("file1.txt");

    const ignoredFilesWithOutside = getGitIgnoredPaths(rootDir, { entireRepo: true });
    expect(ignoredFilesWithOutside).toEqual(ignoredFiles);
  });

  test("throws when not in git repo", () => {
    writePaths(PATHS_TXT);
    writePaths(PATHS_MD);
    writeFile(".gitignore", "*.md\ndir/subdir/");

    expect(() => getGitIgnoredPaths(rootDir)).toThrowErrorMatchingInlineSnapshot(`
      "Failed to get git ignored files.

      Command failed: git ls-files -z --others --ignored --exclude-standard --directory
      fatal: not a git repository (or any of the parent directories): .git
      "
    `);

    expect(() => getGitIgnoredPaths(rootDir, { entireRepo: true }))
      .toThrowErrorMatchingInlineSnapshot(`
      "Failed to get git root path.

      Command failed: git rev-parse --show-cdup
      fatal: not a git repository (or any of the parent directories): .git
      "
    `);
  });

  test("supports higher-level gitignore", () => {
    const pkgPath = "pkg/a";
    writePaths(PATHS_TXT.map((p) => path.join(pkgPath, p)));
    writePaths(PATHS_MD.map((p) => path.join(pkgPath, p)));

    writeFile(`.gitignore`, "*.md");
    execSync("git init", {
      cwd: rootDir,
    });

    const packageDir = path.join(rootDir, pkgPath);
    const ignoredFiles = getGitIgnoredPaths(packageDir);
    expect(ignoredFiles).toMatchInlineSnapshot(`
      [
        "dir/file2.md",
        "dir/subdir/file3.md",
        "file1.md",
      ]
    `);

    expect(ignoredFiles).toContain("file1.md");
    expect(ignoredFiles).toContain("dir/file2.md");
    expect(ignoredFiles).toContain("dir/subdir/file3.md");

    const ignoredFilesWithOutside = getGitIgnoredPaths(packageDir, { entireRepo: true });
    expect(ignoredFilesWithOutside).toEqual(ignoredFiles);
  });

  test("supports outside paths", () => {
    const nativePkg = "pkg/native";
    writePaths(PATHS_TXT.map((p) => path.join(nativePkg, p)));
    writePaths(PATHS_MD.map((p) => path.join(nativePkg, p)));
    writePaths(["root-file.md", "root-file.txt"]);
    writePaths(["pkg/js/package.json"]);

    writeFile(`.gitignore`, "*.md");
    execSync("git init", { cwd: rootDir });

    const jsPkgPath = path.join(rootDir, "pkg/js");
    const ignoredFiles = getGitIgnoredPaths(jsPkgPath, { entireRepo: true });
    expect(ignoredFiles).toMatchInlineSnapshot(`
      [
        "../../root-file.md",
        "../native/dir/file2.md",
        "../native/dir/subdir/file3.md",
        "../native/file1.md",
      ]
    `);

    expect(ignoredFiles).toContain("../../root-file.md");
    expect(ignoredFiles).toContain("../native/file1.md");
    expect(ignoredFiles).toContain("../native/dir/file2.md");
    expect(ignoredFiles).toContain("../native/dir/subdir/file3.md");
  });
});

describe("remapPaths", () => {
  test("handles basic cases", () => {
    expect(remapPaths("file.txt", "/a/b/", "/a/b/c/")).toEqual("../file.txt");
    expect(remapPaths("file.txt", "/a/", "/a/b/c/")).toEqual("../../file.txt");
  });
});
