import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";

import { findData, findFile } from "../../test-utils/assert.js";
import { formatFingerprint } from "../../test-utils/format.js";
import { createRootDir } from "../../test-utils/fs.js";
import {
  calculateFingerprint,
  calculateFingerprintSync,
  type FingerprintOptions,
  getGitIgnoredPaths,
} from "../index.js";
import { jsonContent } from "../inputs/content.js";

const PATHS_TXT = ["file1.txt", "dir/file2.txt", "dir/subdir/file3.txt"];
const PATHS_MD = ["file1.md", "dir/file2.md", "dir/subdir/file3.md"];

const { basePath, prepareRootDir, writePaths, writeFile } = createRootDir("fingerprint-test");

beforeEach(() => {
  prepareRootDir();
});

describe("calculateFingerprint", () => {
  test("supports files and directories", async () => {
    writePaths(["file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

    const fingerprint = await calculateFingerprint(basePath);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: b2ecd14046c04602378fbac3a04a2ec0408f4db0
      Files:
      - dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Content:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-1/file-2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/nested/file-3.txt")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(basePath);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("supports content inputs", async () => {
    const options: FingerprintOptions = {
      extraInputs: {
        "test-content-1": { content: "Hello, world!" },
        "test-content-2": { content: "Lorem ipsum" },
      },
    };

    const fingerprint = await calculateFingerprint(basePath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: d0ea126b88b40478b2683d693b535fc623ed1385
      Files:
      Content:
      - test-content-1 - 943a702d06f34599aee1f8da8ef9f7296031d699
      - test-content-2 - 94912be8b3fb47d4161ea50e5948c6296af6ca05
      "
    `);

    expect(findData(fingerprint, "test-content-1")).toBeTruthy();
    expect(findData(fingerprint, "test-content-2")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(basePath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("supports json inputs", async () => {
    const options: FingerprintOptions = {
      extraInputs: {
        "test-json-1": jsonContent({ foo: "bar", baz: 123 }),
        "test-json-2": jsonContent(["Hello", 123, null, { foo: "bar" }, ["nested", "array"]]),
        "test-json-3": jsonContent("Hello, world!"),
        "test-json-4": jsonContent(123),
        "test-json-5": jsonContent(true),
        "test-json-6": jsonContent(false),
        "test-json-7": jsonContent(null),
        "test-json-8": jsonContent(undefined),
      },
    };

    const fingerprint = await calculateFingerprint(basePath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 94c38b3e91afbd7723b623ef3778364015b2031d
      Files:
      Content:
      - test-json-1 - 7391dce2d9080f78b92f62bb43b308a2f073b0e5
      - test-json-2 - d055f20cb008001f5d37a94456391aecf0b1e724
      - test-json-3 - bea2c9d7fd040292e0424938af39f7d6334e8d8a
      - test-json-4 - 40bd001563085fc35165329ea1ff5c5ecbdbbeef
      - test-json-5 - 5ffe533b830f08a0326348a9160afafc8ada44db
      - test-json-6 - 7cb6efb98ba5972a9b5090dc2e517fe14d12cb04
      - test-json-7 - 2be88ca4242c76e8253ac62474851065032d6833
      - test-json-8 - fd4fceaeaaaee7126a8ab895b8ac0ca73d18d54b
      "
      `);

    expect(findData(fingerprint, "test-json-1")).toBeTruthy();
    expect(findData(fingerprint, "test-json-2")).toBeTruthy();
    expect(findData(fingerprint, "test-json-3")).toBeTruthy();
    expect(findData(fingerprint, "test-json-4")).toBeTruthy();
    expect(findData(fingerprint, "test-json-5")).toBeTruthy();
    expect(findData(fingerprint, "test-json-6")).toBeTruthy();
    expect(findData(fingerprint, "test-json-7")).toBeTruthy();
    expect(findData(fingerprint, "test-json-8")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(basePath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("supports file patterns", async () => {
    writePaths(["file-0.txt", "file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

    const options: FingerprintOptions = {
      files: ["file-1.txt", "dir-1/file-2.txt", "dir-2/", "non-existent.txt", "non-existent-dir/"],
    };

    const fingerprint = await calculateFingerprint(basePath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: b2ecd14046c04602378fbac3a04a2ec0408f4db0
      Files:
      - dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Content:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-1/file-2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/nested/file-3.txt")).toBeTruthy();

    expect(findFile(fingerprint, "file-0.txt")).toBeNull();
    expect(findFile(fingerprint, "non-existent.txt")).toBeNull();
    expect(findFile(fingerprint, "non-existent-dir")).toBeNull();

    const fingerprintSync = calculateFingerprintSync(basePath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test('supports "ignores" patterns', async () => {
    writePaths([
      "file-1.txt",
      "file-2.md",
      "dir-1/file-3.txt",
      "dir-1/file-4.md",
      "dir-2/nested/file-5.txt",
      "dir-2/nested/file-6.md",
      "dir-3/file-7.txt",
    ]);

    const options: FingerprintOptions = {
      ignores: ["**/*.md", "dir-1"],
    };

    const fingerprint = await calculateFingerprint(basePath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: c18e6d8402009e2e2213ce0d1f845435703e6411
      Files:
      - dir-2/nested/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir-3/file-7.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Content:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/nested/file-5.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-3/file-7.txt")).toBeTruthy();

    expect(findFile(fingerprint, "file-2.md")).toBeNull();
    expect(findFile(fingerprint, "dir-1/file-3.txt")).toBeNull();
    expect(findFile(fingerprint, "dir-1/file-4.md")).toBeNull();
    expect(findFile(fingerprint, "dir-2/nested/file-6.md")).toBeNull();

    const fingerprintSync = calculateFingerprintSync(basePath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("supports both files and ignores patterns", async () => {
    writePaths([
      "file-1.txt",
      "file-2.md",
      "dir-1/file-3.txt",
      "dir-1/file-4.md",
      "dir-2/file-5.txt",
      "dir-2/nested/file-6.txt",
      "dir-2/nested/file-7.md",
      "dir-3/file-8.txt",
    ]);

    const options: FingerprintOptions = {
      files: ["file-1.txt", "dir-1/", "dir-2"],
      ignores: ["**/*.md", "dir-2/nested"],
    };

    const fingerprint = await calculateFingerprint(basePath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 1cb4f6d53cae1ab8068780c4e64cd4db9eabed45
      Files:
      - dir-1/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir-2/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Content:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-1/file-3.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/file-5.txt")).toBeTruthy();

    expect(findFile(fingerprint, "file-2.md")).toBeNull();
    expect(findFile(fingerprint, "dir-1/file-4.md")).toBeNull();
    expect(findFile(fingerprint, "dir-2/nested/file-6.md")).toBeNull();
    expect(findFile(fingerprint, "dir-3/file-8.txt")).toBeNull();

    const fingerprintSync = calculateFingerprintSync(basePath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("follows symlinks", async () => {
    writePaths(["file1.txt", "dir-1/"]);
    fs.symlinkSync(
      path.join(basePath, "file1.txt"),
      path.join(basePath, "dir-1", "file-link1.txt"),
    );

    const options: FingerprintOptions = {
      files: ["dir-1/file-link1.txt"],
    };

    const fingerprint = await calculateFingerprint(basePath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 4e8e0ad25176ea41bb7a701b9619a044a27b50da
      Files:
      - dir-1/file-link1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Content:
      "
    `);

    expect(findFile(fingerprint, "dir-1/file-link1.txt")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(basePath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("handles null hashing algorithm", async () => {
    writePaths(["file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

    const options: FingerprintOptions = {
      hashAlgorithm: "null",
    };

    const fingerprint = await calculateFingerprint(basePath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: (null)
      Files:
      - dir-1/file-2.txt - (null)
      - dir-2/nested/file-3.txt - (null)
      - file-1.txt - (null)
      Content:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-1/file-2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/nested/file-3.txt")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(basePath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test('handles "files" outside of "basePath" (e.g. "..")', async () => {
    writePaths(PATHS_TXT.map((p) => path.join("pkg/a", p)));
    writePaths(PATHS_TXT.map((p) => path.join("pkg/b", p)));
    writePaths(["root-file.txt"]);

    const options: FingerprintOptions = {
      files: ["**/*.txt", "../../pkg/b/**/*.txt", "../../root-file.txt"],
    };

    const packagePath = path.join(basePath, "pkg/a");
    const fingerprint = await calculateFingerprint(packagePath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 517f0f053c6726df50bdf41e4d2f2f1f8c58feca
      Files:
      - ../../root-file.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - ../b/dir/file2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - ../b/dir/subdir/file3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - ../b/file1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir/file2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir/subdir/file3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Content:
      "
    `);
    expect(findFile(fingerprint, "file1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir/file2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir/subdir/file3.txt")).toBeTruthy();
    expect(findFile(fingerprint, "../../root-file.txt")).toBeTruthy();
    expect(findFile(fingerprint, "../b/file1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "../b/dir/file2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "../b/dir/subdir/file3.txt")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(packagePath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test('handles "files" outside of "basePath" (e.g. "..") with .gitignore', async () => {
    writePaths(PATHS_TXT.map((p) => path.join("pkg/a", p)));
    writePaths(PATHS_MD.map((p) => path.join("pkg/a", p)));
    writePaths(PATHS_TXT.map((p) => path.join("pkg/b", p)));
    writePaths(PATHS_MD.map((p) => path.join("pkg/b", p)));
    writePaths(["root-file.txt", "root-file.md"]);
    writeFile(".gitignore", "*.md");

    execSync("git init", {
      cwd: basePath,
    });

    const packageRootPath = path.join(basePath, "pkg/a");
    const ignoredPaths = getGitIgnoredPaths(packageRootPath, { entireRepo: true });
    expect(ignoredPaths).toMatchInlineSnapshot(`
      [
        "../../root-file.md",
        "../b/dir/file2.md",
        "../b/dir/subdir/file3.md",
        "../b/file1.md",
        "dir/file2.md",
        "dir/subdir/file3.md",
        "file1.md",
      ]
    `);

    const options: FingerprintOptions = {
      files: ["**/*.txt", "../../pkg/b", "../../root-file.*"],
      ignores: [...ignoredPaths],
    };

    const fingerprint = await calculateFingerprint(packageRootPath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 517f0f053c6726df50bdf41e4d2f2f1f8c58feca
      Files:
      - ../../root-file.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - ../b/dir/file2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - ../b/dir/subdir/file3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - ../b/file1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir/file2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir/subdir/file3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Content:
      "
    `);
    expect(findFile(fingerprint, "file1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir/file2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir/subdir/file3.txt")).toBeTruthy();
    expect(findFile(fingerprint, "../../root-file.txt")).toBeTruthy();
    expect(findFile(fingerprint, "../b/file1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "../b/dir/file2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "../b/dir/subdir/file3.txt")).toBeTruthy();

    expect(findFile(fingerprint, "file1.md")).toBeNull();
    expect(findFile(fingerprint, "dir/file2.md")).toBeNull();
    expect(findFile(fingerprint, "dir/subdir/file3.md")).toBeNull();
    expect(findFile(fingerprint, "../../root-file.md")).toBeNull();
    expect(findFile(fingerprint, "../b/file1.md")).toBeNull();
    expect(findFile(fingerprint, "../b/dir/file2.md")).toBeNull();
    expect(findFile(fingerprint, "../b/dir/subdir/file3.md")).toBeNull();

    const fingerprintSync = calculateFingerprintSync(packageRootPath, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });
});
