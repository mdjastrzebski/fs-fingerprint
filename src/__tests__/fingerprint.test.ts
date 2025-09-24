import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";

import { findFile, findInput } from "../../test-utils/assert.js";
import { formatFingerprint } from "../../test-utils/format.js";
import { createRootDir } from "../../test-utils/fs.js";
import {
  calculateFingerprint,
  calculateFingerprintSync,
  type FingerprintOptions,
  getGitIgnoredPaths,
} from "../index.js";

const PATHS_TXT = ["file1.txt", "dir/file2.txt", "dir/subdir/file3.txt"];
const PATHS_MD = ["file1.md", "dir/file2.md", "dir/subdir/file3.md"];

const { rootDir, prepareRootDir, writePaths, writeFile } = createRootDir("fingerprint-test");

beforeEach(() => {
  prepareRootDir();
});

describe("calculateFingerprint", () => {
  test("supports files and directories", async () => {
    writePaths(["file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

    const fingerprint = await calculateFingerprint(rootDir);

    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: b2ecd14046c04602378fbac3a04a2ec0408f4db0
      Files:
      - dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Inputs:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-1/file-2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/nested/file-3.txt")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(rootDir);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("supports content inputs", async () => {
    const options: FingerprintOptions = {
      extraInputs: [
        { key: "test-content-1", content: "Hello, world!" },
        { key: "test-content-2", content: "Lorem ipsum" },
      ],
    };

    const fingerprint = await calculateFingerprint(rootDir, options);

    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 3e4e7efb4fb2b777bb2e5ab5d5143e502ba8fa38
      Files:
      Inputs:
      - content:test-content-1 - 943a702d06f34599aee1f8da8ef9f7296031d699
      - content:test-content-2 - 94912be8b3fb47d4161ea50e5948c6296af6ca05
      "
    `);

    expect(findInput(fingerprint, "test-content-1")).toBeTruthy();
    expect(findInput(fingerprint, "test-content-2")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(rootDir, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("supports json inputs", async () => {
    const options: FingerprintOptions = {
      extraInputs: [
        { key: "test-json-1", json: { foo: "bar", baz: 123 } },
        { key: "test-json-2", json: ["Hello", 123, null, { foo: "bar" }, ["nested", "array"]] },
        { key: "test-json-3", json: "Hello, world!" },
        { key: "test-json-4", json: 123 },
        { key: "test-json-5", json: true },
        { key: "test-json-6", json: false },
        { key: "test-json-7", json: null },
        { key: "test-json-8", json: undefined },
      ],
    };

    const fingerprint = await calculateFingerprint(rootDir, options);

    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 52d2991a1b2e3a60584c2b23d92eebc33bad2218
      Files:
      Inputs:
      - json:test-json-1 - 2e0706ddb09be38781b9b2bcc14c75d7b028ce61
      - json:test-json-2 - 5ed10667370d4eee8fd1ec08cffef2c2002d2ce9
      - json:test-json-3 - bea2c9d7fd040292e0424938af39f7d6334e8d8a
      - json:test-json-4 - 40bd001563085fc35165329ea1ff5c5ecbdbbeef
      - json:test-json-5 - 5ffe533b830f08a0326348a9160afafc8ada44db
      - json:test-json-6 - 7cb6efb98ba5972a9b5090dc2e517fe14d12cb04
      - json:test-json-7 - 2be88ca4242c76e8253ac62474851065032d6833
      - json:test-json-8 - d5d4cd07616a542891b7ec2d0257b3a24b69856e
      "
      `);

    expect(findInput(fingerprint, "test-json-1")).toBeTruthy();
    expect(findInput(fingerprint, "test-json-2")).toBeTruthy();
    expect(findInput(fingerprint, "test-json-3")).toBeTruthy();
    expect(findInput(fingerprint, "test-json-4")).toBeTruthy();
    expect(findInput(fingerprint, "test-json-5")).toBeTruthy();
    expect(findInput(fingerprint, "test-json-6")).toBeTruthy();
    expect(findInput(fingerprint, "test-json-7")).toBeTruthy();
    expect(findInput(fingerprint, "test-json-8")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(rootDir, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("throws for unsupported input type", async () => {
    const options: FingerprintOptions = {
      // @ts-expect-error - This is intentionally invalid input type
      extraInputs: [{ key: "test-json-1", unknown: "This will throw" }],
    };

    expect(() => calculateFingerprint(rootDir, options)).toThrow(/Unsupported input type/);
    expect(() => calculateFingerprintSync(rootDir, options)).toThrow(/Unsupported input type/);
  });

  test("supports include patterns", async () => {
    writePaths(["file-0.txt", "file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

    const options: FingerprintOptions = {
      include: [
        "file-1.txt",
        "dir-1/file-2.txt",
        "dir-2/",
        "non-existent.txt",
        "non-existent-dir/",
      ],
    };

    const fingerprint = await calculateFingerprint(rootDir, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: b2ecd14046c04602378fbac3a04a2ec0408f4db0
      Files:
      - dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Inputs:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-1/file-2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/nested/file-3.txt")).toBeTruthy();

    expect(findFile(fingerprint, "file-0.txt")).toBeNull();
    expect(findFile(fingerprint, "non-existent.txt")).toBeNull();
    expect(findFile(fingerprint, "non-existent-dir")).toBeNull();

    const fingerprintSync = calculateFingerprintSync(rootDir, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("supports exclude patterns", async () => {
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
      exclude: ["**/*.md", "dir-1"],
    };

    const fingerprint = await calculateFingerprint(rootDir, options);

    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: c18e6d8402009e2e2213ce0d1f845435703e6411
      Files:
      - dir-2/nested/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir-3/file-7.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Inputs:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/nested/file-5.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-3/file-7.txt")).toBeTruthy();

    expect(findFile(fingerprint, "file-2.md")).toBeNull();
    expect(findFile(fingerprint, "dir-1/file-3.txt")).toBeNull();
    expect(findFile(fingerprint, "dir-1/file-4.md")).toBeNull();
    expect(findFile(fingerprint, "dir-2/nested/file-6.md")).toBeNull();

    const fingerprintSync = calculateFingerprintSync(rootDir, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("supports both include and exclude patterns", async () => {
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
      include: ["file-1.txt", "dir-1/", "dir-2"],
      exclude: ["**/*.md", "dir-2/nested"],
    };

    const fingerprint = await calculateFingerprint(rootDir, options);

    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 1cb4f6d53cae1ab8068780c4e64cd4db9eabed45
      Files:
      - dir-1/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - dir-2/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Inputs:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-1/file-3.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/file-5.txt")).toBeTruthy();

    expect(findFile(fingerprint, "file-2.md")).toBeNull();
    expect(findFile(fingerprint, "dir-1/file-4.md")).toBeNull();
    expect(findFile(fingerprint, "dir-2/nested/file-6.md")).toBeNull();
    expect(findFile(fingerprint, "dir-3/file-8.txt")).toBeNull();

    const fingerprintSync = calculateFingerprintSync(rootDir, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("follows symlinks", async () => {
    writePaths(["file1.txt", "dir-1/"]);
    fs.symlinkSync(path.join(rootDir, "file1.txt"), path.join(rootDir, "dir-1", "file-link1.txt"));

    const options: FingerprintOptions = {
      include: ["dir-1/file-link1.txt"],
    };

    const fingerprint = await calculateFingerprint(rootDir, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 4e8e0ad25176ea41bb7a701b9619a044a27b50da
      Files:
      - dir-1/file-link1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      Inputs:
      "
    `);

    expect(findFile(fingerprint, "dir-1/file-link1.txt")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(rootDir, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test("handles null hashing algorithm", async () => {
    writePaths(["file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

    const options: FingerprintOptions = {
      hashAlgorithm: "null",
    };

    const fingerprint = await calculateFingerprint(rootDir, options);

    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: (null)
      Files:
      - dir-1/file-2.txt - (null)
      - dir-2/nested/file-3.txt - (null)
      - file-1.txt - (null)
      Inputs:
      "
    `);

    expect(findFile(fingerprint, "file-1.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-1/file-2.txt")).toBeTruthy();
    expect(findFile(fingerprint, "dir-2/nested/file-3.txt")).toBeTruthy();

    const fingerprintSync = calculateFingerprintSync(rootDir, options);
    expect(fingerprintSync).toEqual(fingerprint);
  });

  test('handles includes outside of rootDir (e.g. "..")', async () => {
    writePaths(PATHS_TXT.map((p) => path.join("pkg/a", p)));
    writePaths(PATHS_TXT.map((p) => path.join("pkg/b", p)));
    writePaths(["root-file.txt"]);

    const options: FingerprintOptions = {
      include: ["**/*.txt", "../../pkg/b/**/*.txt", "../../root-file.txt"],
    };

    const packagePath = path.join(rootDir, "pkg/a");
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
      Inputs:
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

  test('handles includes outside of rootDir (e.g. "..") with .gitignore', async () => {
    writePaths(PATHS_TXT.map((p) => path.join("pkg/a", p)));
    writePaths(PATHS_MD.map((p) => path.join("pkg/a", p)));
    writePaths(PATHS_TXT.map((p) => path.join("pkg/b", p)));
    writePaths(PATHS_MD.map((p) => path.join("pkg/b", p)));
    writePaths(["root-file.txt", "root-file.md"]);
    writeFile(".gitignore", "*.md");

    execSync("git init", {
      cwd: rootDir,
    });

    const packageRootPath = path.join(rootDir, "pkg/a");
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
      include: ["**/*.txt", "../../pkg/b", "../../root-file.*"],
      exclude: [...ignoredPaths],
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
      Inputs:
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
