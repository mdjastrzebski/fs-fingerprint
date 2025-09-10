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
    "Hash: 768e1dbe174582c263ef20a0858737e3c5d027f5
    Inputs:
      - DIRECTORY dir-1/ - ec848d637ae6d52a61e7bfa6870ad921fc6ae048
          - FILE dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - 53b20bf3e108f2233eed205dd3696067be869e28
          - DIRECTORY dir-2/nested/ - b8645c615700a17e8770dfa27a513f0ee1cdf890
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
    "Hash: 13e2ed72e8e0b878ecbcea2af1ada97e807c2e4f
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
    "Hash: 4d4ae5db202291ebe5f18ee6543a61b350e61b1d
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
    "Hash: 2e320b4cd87db49db3619afafd6facece8e71561
    Inputs:
      - DIRECTORY dir-2/ - 53b20bf3e108f2233eed205dd3696067be869e28
          - DIRECTORY dir-2/nested/ - b8645c615700a17e8770dfa27a513f0ee1cdf890
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
    "Hash: 51ed5d9850c49fc23660f0e3fb651df774493a69
    Inputs:
      - DIRECTORY dir-2/ - a8377c25773c71349b24d71cf93adf4a9f210c7b
          - DIRECTORY dir-2/nested/ - 677ae87039746d91827b0804bcaab953e3a4966a
              - FILE dir-2/nested/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-3/ - 6edb4fc88c3140146470550779520f9542d24336
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
    "Hash: 0ad70a205a6b15b4da866134fc5175c6258acce9
    Inputs:
      - DIRECTORY dir-1/ - 7f4fcdecd2d8a0a60d6733958f9773483a12c854
          - FILE dir-1/file-3.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - 8db312c70df4d58d50b03156fa41c1ba0ee28849
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
    "Hash: 51ed5d9850c49fc23660f0e3fb651df774493a69
    Inputs:
      - DIRECTORY dir-2/ - a8377c25773c71349b24d71cf93adf4a9f210c7b
          - DIRECTORY dir-2/nested/ - 677ae87039746d91827b0804bcaab953e3a4966a
              - FILE dir-2/nested/file-5.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-3/ - 6edb4fc88c3140146470550779520f9542d24336
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
    "Hash: 768e1dbe174582c263ef20a0858737e3c5d027f5
    Inputs:
      - DIRECTORY dir-1/ - ec848d637ae6d52a61e7bfa6870ad921fc6ae048
          - FILE dir-1/file-2.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir-2/ - 53b20bf3e108f2233eed205dd3696067be869e28
          - DIRECTORY dir-2/nested/ - b8645c615700a17e8770dfa27a513f0ee1cdf890
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
