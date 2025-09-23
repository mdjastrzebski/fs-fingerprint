import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, describe, expect, test } from "bun:test";

import { findInput } from "../../test-utils/assert.js";
import { formatFingerprint } from "../../test-utils/format.js";
import { createRootDir } from "../../test-utils/fs.js";
import {
  calculateFingerprint,
  calculateFingerprintSync,
  getGitIgnoredPaths,
  type FingerprintOptions,
} from "../index.js";
import { get } from "node:http";
import { execSync } from "node:child_process";

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
      "Hash: a7ee23ee0b180e85386a5d3c89904407abf15ee4
      Inputs:
        - dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      "
    `);

    expect(findInput(fingerprint.inputs, "file-1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-1/file-2.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-2/nested/file-3.txt")).toBeTruthy();

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
      "Hash: 99cb8f1cc97b0302838cd30059514fe892034fed
      Inputs:
        - test-content-1 - 943a702d06f34599aee1f8da8ef9f7296031d699
        - test-content-2 - 94912be8b3fb47d4161ea50e5948c6296af6ca05
      "
    `);

    expect(findInput(fingerprint.inputs, "test-content-1")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "test-content-2")).toBeTruthy();

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
      "Hash: 30ed44060ae76efc2623835dc5ec5efc0c493a7c
      Inputs:
        - test-json-1 - 2e0706ddb09be38781b9b2bcc14c75d7b028ce61
        - test-json-2 - 5ed10667370d4eee8fd1ec08cffef2c2002d2ce9
        - test-json-3 - bea2c9d7fd040292e0424938af39f7d6334e8d8a
        - test-json-4 - 40bd001563085fc35165329ea1ff5c5ecbdbbeef
        - test-json-5 - 5ffe533b830f08a0326348a9160afafc8ada44db
        - test-json-6 - 7cb6efb98ba5972a9b5090dc2e517fe14d12cb04
        - test-json-7 - 2be88ca4242c76e8253ac62474851065032d6833
        - test-json-8 - d5d4cd07616a542891b7ec2d0257b3a24b69856e
      "
      `);

    expect(findInput(fingerprint.inputs, "test-json-1")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "test-json-2")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "test-json-3")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "test-json-4")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "test-json-5")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "test-json-6")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "test-json-7")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "test-json-8")).toBeTruthy();

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
      "Hash: a7ee23ee0b180e85386a5d3c89904407abf15ee4
      Inputs:
        - dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      "
    `);

    expect(findInput(fingerprint.inputs, "file-1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-1/file-2.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-2/nested/file-3.txt")).toBeTruthy();

    expect(findInput(fingerprint.inputs, "file-0.txt")).toBeNull();
    expect(findInput(fingerprint.inputs, "non-existent.txt")).toBeNull();
    expect(findInput(fingerprint.inputs, "non-existent-dir")).toBeNull();

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
      "Hash: 8eae035d400562fab2acee2bfb7a7f5c6151454d
      Inputs:
        - dir-2/nested/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - dir-3/file-7.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      "
    `);

    expect(findInput(fingerprint.inputs, "file-1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-2/nested/file-5.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-3/file-7.txt")).toBeTruthy();

    expect(findInput(fingerprint.inputs, "file-2.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "dir-1/file-3.txt")).toBeNull();
    expect(findInput(fingerprint.inputs, "dir-1/file-4.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "dir-2/nested/file-6.md")).toBeNull();

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
      "Hash: efa0eaf39af3352f4a6138a382b315a1a33dff01
      Inputs:
        - dir-1/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - dir-2/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      "
    `);

    expect(findInput(fingerprint.inputs, "file-1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-1/file-3.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-2/file-5.txt")).toBeTruthy();

    expect(findInput(fingerprint.inputs, "file-2.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "dir-1/file-4.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "dir-2/nested/file-6.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "dir-3/file-8.txt")).toBeNull();

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
      "Hash: 1ac27c550eb0af4de10ecd3c5cbe5fb3b6a16848
      Inputs:
        - dir-1/file-link1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      "
    `);

    expect(findInput(fingerprint.inputs, "dir-1/file-link1.txt")).toBeTruthy();

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
      Inputs:
        - dir-1/file-2.txt - (null)
        - dir-2/nested/file-3.txt - (null)
        - file-1.txt - (null)
      "
    `);

    expect(findInput(fingerprint.inputs, "file-1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-1/file-2.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir-2/nested/file-3.txt")).toBeTruthy();

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

    const fingerprint = await calculateFingerprint(path.join(rootDir, "pkg/a"), options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: 16401631f9f764537c5c703054921b8ffe10724a
      Inputs:
        - ../../root-file.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/dir/file2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/dir/subdir/file3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/file1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - dir/file2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - dir/subdir/file3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - file1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      "
    `);
    expect(findInput(fingerprint.inputs, "file1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir/file2.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir/subdir/file3.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "../../root-file.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "../b/file1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "../b/dir/file2.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "../b/dir/subdir/file3.txt")).toBeTruthy();
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
    const ignoredPaths = getGitIgnoredPaths(packageRootPath);
    expect(ignoredPaths).toMatchInlineSnapshot(`
      [
        "pkg/a/dir/file2.md",
        "pkg/a/dir/subdir/file3.md",
        "pkg/a/file1.md",
      ]
    `);

    const options: FingerprintOptions = {
      include: ["**/*.txt", "../../pkg/b", "../../root-file.*"],
      exclude: [...ignoredPaths],
    };

    const fingerprint = await calculateFingerprint(packageRootPath, options);
    expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
      "Hash: fce4e4465574fed0e75ff8e60f8d74bc18ab00e1
      Inputs:
        - ../../root-file.md - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../../root-file.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/dir/file2.md - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/dir/file2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/dir/subdir/file3.md - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/dir/subdir/file3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/file1.md - 943a702d06f34599aee1f8da8ef9f7296031d699
        - ../b/file1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - dir/file2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - dir/subdir/file3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
        - file1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      "
    `);
    expect(findInput(fingerprint.inputs, "file1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir/file2.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "dir/subdir/file3.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "../../root-file.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "../b/file1.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "../b/dir/file2.txt")).toBeTruthy();
    expect(findInput(fingerprint.inputs, "../b/dir/subdir/file3.txt")).toBeTruthy();

    expect(findInput(fingerprint.inputs, "file1.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "dir/file2.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "dir/subdir/file3.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "../../root-file.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "../b/file1.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "../b/dir/file2.md")).toBeNull();
    expect(findInput(fingerprint.inputs, "../b/dir/subdir/file3.md")).toBeNull();
  });
});
