import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, expect, spyOn, test } from "bun:test";

import { findInput } from "../../test-utils/assert.js";
import { formatFingerprint } from "../../test-utils/format.js";
import { createRootDir } from "../../test-utils/fs.js";
import {
  calculateFingerprint,
  calculateFingerprintSync,
  type FingerprintOptions,
} from "../index.js";

const { rootDir, writePaths, writeFile } = createRootDir("fingerprint-test");

beforeEach(() => {
  if (fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true });
  }

  fs.mkdirSync(rootDir, { recursive: true });
});

test("calculateFingerprint supports files and directories", async () => {
  writePaths(["file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

  const fingerprint = await calculateFingerprint(rootDir);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 1271833689bf15d667a6b693e74a3750116246f4
    Inputs:
      - DIRECTORY dir-1/ - 764b2647b41ffe8b2d268aff8633a0517dbbeb35
          - FILE file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - dcae7f6c77bee9d2116f4fe23fc221b4a801c24d
          - DIRECTORY nested/ - 1ef4c4598129087db58c2fc98410e6735d610700
              - FILE file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(findInput(fingerprint.inputs, "file-1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir-1/file-2.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir-2/nested/file-3.txt")).toBeTruthy();

  const fingerprintSync = calculateFingerprintSync(rootDir);
  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculateFingerprint supports content inputs", async () => {
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
      - CONTENT test-content-1 - 943a702d06f34599aee1f8da8ef9f7296031d699
      - CONTENT test-content-2 - 94912be8b3fb47d4161ea50e5948c6296af6ca05
    "
  `);

  expect(findInput(fingerprint.inputs, "test-content-1")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "test-content-2")).toBeTruthy();

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculateFingerprint supports json inputs", async () => {
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

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(
    `
    "Hash: 30ed44060ae76efc2623835dc5ec5efc0c493a7c
    Inputs:
      - JSON test-json-1 - 2e0706ddb09be38781b9b2bcc14c75d7b028ce61
      - JSON test-json-2 - 5ed10667370d4eee8fd1ec08cffef2c2002d2ce9
      - JSON test-json-3 - bea2c9d7fd040292e0424938af39f7d6334e8d8a
      - JSON test-json-4 - 40bd001563085fc35165329ea1ff5c5ecbdbbeef
      - JSON test-json-5 - 5ffe533b830f08a0326348a9160afafc8ada44db
      - JSON test-json-6 - 7cb6efb98ba5972a9b5090dc2e517fe14d12cb04
      - JSON test-json-7 - 2be88ca4242c76e8253ac62474851065032d6833
      - JSON test-json-8 - d5d4cd07616a542891b7ec2d0257b3a24b69856e
    "
  `,
  );

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

test("calculateFingerprint throws for unsupported input type", async () => {
  const options: FingerprintOptions = {
    // @ts-expect-error - This is intentionally invalid input type
    extraInputs: [{ key: "test-json-1", unknown: "This will throw" }],
  };

  expect(() => calculateFingerprint(rootDir, options)).toThrow(/Unsupported input type/);
  expect(() => calculateFingerprintSync(rootDir, options)).toThrow(/Unsupported input type/);
});

test("calculateFingerprint handles include patterns", async () => {
  writePaths(["file-0.txt", "file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

  const options: FingerprintOptions = {
    include: ["file-1.txt", "dir-1/file-2.txt", "dir-2/", "non-existent.txt", "non-existent-dir/"],
  };

  const fingerprint = await calculateFingerprint(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 7eb488ee67dfa2ac18dc1b23d3fc92ba9db7459a
    Inputs:
      - DIRECTORY dir-2/ - dcae7f6c77bee9d2116f4fe23fc221b4a801c24d
          - DIRECTORY nested/ - 1ef4c4598129087db58c2fc98410e6735d610700
              - FILE file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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

test("calculateFingerprint handles exclude patterns", async () => {
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
    "Hash: 6d50f652d22d4aa841d1578ccf33ad0ec159652a
    Inputs:
      - DIRECTORY dir-2/ - 8cd216ac760f7c3590341a8daf87753f3df2c305
          - DIRECTORY nested/ - c99e1a5bb70b26c7554f80f8e42073dcc45c294c
              - FILE file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-3/ - 4996ccce10e2aa0ac5d38df18b5c90914d4fcff7
          - FILE file-7.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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

test("calculateFingerprint handles both include and exclude patterns", async () => {
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
    "Hash: 6d65be78b6e6be9b70e1eeefc80f4e8ae44e1fb7
    Inputs:
      - DIRECTORY dir-1/ - 1ef4c4598129087db58c2fc98410e6735d610700
          - FILE file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - c99e1a5bb70b26c7554f80f8e42073dcc45c294c
          - FILE file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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

test("calculateFingerprint handles .gitignore file", async () => {
  writePaths([
    "file-1.txt",
    "file-2.md",
    "dir-1/file-3.txt",
    "dir-1/file-4.md",
    "dir-2/nested/file-5.txt",
    "dir-2/nested/file-6.md",
    "dir-3/file-7.txt",
  ]);
  writeFile(".gitignore", "**/*.md\ndir-1");

  const options: FingerprintOptions = {
    exclude: [".gitignore"],
    ignoreFilePath: ".gitignore",
  };

  const fingerprint = await calculateFingerprint(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 6d50f652d22d4aa841d1578ccf33ad0ec159652a
    Inputs:
      - DIRECTORY dir-2/ - 8cd216ac760f7c3590341a8daf87753f3df2c305
          - DIRECTORY nested/ - c99e1a5bb70b26c7554f80f8e42073dcc45c294c
              - FILE file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-3/ - 4996ccce10e2aa0ac5d38df18b5c90914d4fcff7
          - FILE file-7.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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

test("calculateFingerprint handles missing .gitignore file", async () => {
  writePaths(["file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

  const options: FingerprintOptions = {
    ignoreFilePath: ".gitignore",
  };

  const fingerprint = await calculateFingerprint(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 1271833689bf15d667a6b693e74a3750116246f4
    Inputs:
      - DIRECTORY dir-1/ - 764b2647b41ffe8b2d268aff8633a0517dbbeb35
          - FILE file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - dcae7f6c77bee9d2116f4fe23fc221b4a801c24d
          - DIRECTORY nested/ - 1ef4c4598129087db58c2fc98410e6735d610700
              - FILE file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  expect(findInput(fingerprint.inputs, "file-1.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir-1/file-2.txt")).toBeTruthy();
  expect(findInput(fingerprint.inputs, "dir-2/nested/file-3.txt")).toBeTruthy();

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculateFingerprint warns for non-file/non-directory entries", async () => {
  writePaths(["dir-1/"]);
  fs.symlinkSync("/dev/null", path.join(rootDir, "dir-1", "dev-null-link"));

  const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => undefined);

  const options: FingerprintOptions = {
    include: ["dir-1/dev-null-link"],
  };

  await calculateFingerprint(rootDir, options);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    'fs-fingerprint: skipping "dir-1/dev-null-link" (not a file or directory)',
  );

  consoleWarnSpy.mockClear();
  calculateFingerprintSync(rootDir, options);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    'fs-fingerprint: skipping "dir-1/dev-null-link" (not a file or directory)',
  );
});

test("calculateFingerprint directory hash should depend on content but not location", async () => {
  writePaths(["dir-1/file-1.txt", "dir-2/nested/file-1.txt", "dir-3/file-2.txt"]);

  const fingerprint = await calculateFingerprint(rootDir);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 2cc8586617db41f190ee75843adecbd05ced2e2d
    Inputs:
      - DIRECTORY dir-1/ - 2ce538e6c47ab19463715ed648a3f6a27ec96a33
          - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - ad56bd16bd4108a663b47f2f5de5680a9c186d17
          - DIRECTORY nested/ - 2ce538e6c47ab19463715ed648a3f6a27ec96a33
              - FILE file-1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-3/ - 764b2647b41ffe8b2d268aff8633a0517dbbeb35
          - FILE file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  const hashDir1 = findInput(fingerprint.inputs, "dir-1/");
  const hashDir2Nested = findInput(fingerprint.inputs, "dir-2/nested/");
  const hashDir3 = findInput(fingerprint.inputs, "dir-3/");

  expect(hashDir1?.hash).toBeTruthy();
  expect(hashDir2Nested?.hash).toBe(hashDir1?.hash);
  expect(hashDir3?.hash).not.toBe(hashDir1?.hash);
});
