import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";

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
    "Hash: 23e62713b63d41c43a94d1b90c140c2e3308a7bb
    Inputs:
      - DIRECTORY dir-1/ - 84ef58dcf7a2b1115354cd4d1f70fcd6c04e6a34
          - FILE dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - de2726851255d01e8a801b6c2069c98a14862a0f
          - DIRECTORY dir-2/nested/ - f3046f31039ebf0bff3e192e6b0ec9d7aa440065
              - FILE dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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

  await expect(() => calculateFingerprint(rootDir, options)).rejects.toThrow(
    /Unsupported input type/,
  );
  expect(() => calculateFingerprintSync(rootDir, options)).toThrow(/Unsupported input type/);
});

test("calculateFingerprint handles include patterns", async () => {
  writePaths(["file-0.txt", "file-1.txt", "dir-1/file-2.txt", "dir-2/nested/file-3.txt"]);

  const options: FingerprintOptions = {
    include: ["file-1.txt", "dir-1/file-2.txt", "dir-2/", "non-existent.txt", "non-existent-dir/"],
  };

  const fingerprint = await calculateFingerprint(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: d05fc49975b34f47d20c1c002b70e099deb460b4
    Inputs:
      - DIRECTORY dir-2/ - de2726851255d01e8a801b6c2069c98a14862a0f
          - DIRECTORY dir-2/nested/ - f3046f31039ebf0bff3e192e6b0ec9d7aa440065
              - FILE dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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
    "Hash: c56f512a5d87a9acf70b715de99e92429e1cd3b4
    Inputs:
      - DIRECTORY dir-2/ - fd82e14f10fdccb21e4335923b6f301d545f8e77
          - DIRECTORY dir-2/nested/ - 18cbabbed90623c2b101c8395975e27f6644d886
              - FILE dir-2/nested/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-3/ - de238366c9649dfb04c35efcb096c162b5748df2
          - FILE dir-3/file-7.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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
    "Hash: 82c81ba90c1c90ad84e37753258564d70a7d4144
    Inputs:
      - DIRECTORY dir-1/ - a2a5caa9f970d29d8b2512208246652a20a1d4be
          - FILE dir-1/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - 101bfe21b2d323d5e4749613a8a34387514099c5
          - FILE dir-2/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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
    "Hash: c56f512a5d87a9acf70b715de99e92429e1cd3b4
    Inputs:
      - DIRECTORY dir-2/ - fd82e14f10fdccb21e4335923b6f301d545f8e77
          - DIRECTORY dir-2/nested/ - 18cbabbed90623c2b101c8395975e27f6644d886
              - FILE dir-2/nested/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-3/ - de238366c9649dfb04c35efcb096c162b5748df2
          - FILE dir-3/file-7.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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
    "Hash: 23e62713b63d41c43a94d1b90c140c2e3308a7bb
    Inputs:
      - DIRECTORY dir-1/ - 84ef58dcf7a2b1115354cd4d1f70fcd6c04e6a34
          - FILE dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - de2726851255d01e8a801b6c2069c98a14862a0f
          - DIRECTORY dir-2/nested/ - f3046f31039ebf0bff3e192e6b0ec9d7aa440065
              - FILE dir-2/nested/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
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

  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

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
