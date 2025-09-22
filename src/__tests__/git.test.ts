import { execSync } from "node:child_process";
import * as path from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";

import { createRootDir } from "../../test-utils/fs.js";
import { getGitIgnoredFiles } from "../git.js";

const { rootDir, prepareRootDir, writePaths, writeFile, debug } = createRootDir("git-test");

beforeEach(() => {
  prepareRootDir();
});

const PATHS_TXT = ["file1.txt", "dir/file2.txt", "dir/subdir/file3.txt"];
const PATHS_MD = ["file1.md", "dir/file2.md", "dir/subdir/file3.md"];

describe("getGitIgnoredFiles", () => {
  test("supports basic case", () => {
    writePaths(PATHS_TXT);
    writePaths(PATHS_MD);

    writeFile(".gitignore", "*.md\ndir/subdir/");
    writeFile("dir/.gitignore", "file2.txt");

    execSync("git init", {
      cwd: rootDir,
    });

    const ignoredFiles = getGitIgnoredFiles(rootDir);
    expect(ignoredFiles).toContain("file1.md");
    expect(ignoredFiles).toContain("dir/file2.md");
    expect(ignoredFiles).toContain("dir/file2.txt");
    expect(ignoredFiles).toContain("dir/subdir/");
    expect(ignoredFiles).not.toContain("file1.txt");
  });

  test("throws when not in git repo", () => {
    writePaths(PATHS_TXT);
    writePaths(PATHS_MD);
    writeFile(".gitignore", "*.md\ndir/subdir/");

    expect(() => getGitIgnoredFiles(rootDir)).toThrowErrorMatchingInlineSnapshot(
      `
        "Failed to get git ignored files.

        Command failed: git ls-files -z --others --ignored --exclude-standard --directory --full-name
        fatal: not a git repository (or any of the parent directories): .git
        "
      `,
    );
  });

  test("supports higher-level gitignore", () => {
    const pkgPath = "packages/package";
    writePaths(PATHS_TXT.map((p) => path.join(pkgPath, p)));
    writePaths(PATHS_MD.map((p) => path.join(pkgPath, p)));

    writeFile(`.gitignore`, "*.md");
    execSync("git init", {
      cwd: rootDir,
    });

    const ignoredFiles = getGitIgnoredFiles(path.join(rootDir, pkgPath));
    expect(ignoredFiles).toMatchInlineSnapshot(`
      [
        "packages/package/dir/file2.md",
        "packages/package/dir/subdir/file3.md",
        "packages/package/file1.md",
      ]
    `);
  });

  test.skip("supports outside paths", () => {
    const nativePkg = "packages/native";
    writePaths(PATHS_TXT.map((p) => path.join(nativePkg, p)));
    writePaths(PATHS_MD.map((p) => path.join(nativePkg, p)));
    writePaths(["root-file.md", "root-file.txt"]);
    writePaths(["packages/js/package.json"]);

    writeFile(`.gitignore`, "*.md");
    execSync("git init", {
      cwd: rootDir,
    });

    debug();

    const ignoredFiles = getGitIgnoredFiles(rootDir);
    expect(ignoredFiles).toMatchInlineSnapshot(`
      [
        "packages/native/dir/file2.md",
        "packages/native/dir/subdir/file3.md",
        "packages/native/file1.md",
        "root-file.md",
      ]
    `);
    expect(ignoredFiles).toContain("../root-file.md");
    expect(ignoredFiles).not.toContain("../native/file1.md");
  });
});
