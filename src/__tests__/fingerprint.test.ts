import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import { calculateFingerprint, calculateFingerprintSync } from "../fingerprint.js";
import type { FingerprintInputHash, FingerprintOptions, FingerprintResult } from "../types.js";

const rootDir = path.join(os.tmpdir(), "fingerprint-test");

beforeEach(() => {
  if (fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true });
  }

  fs.mkdirSync(rootDir, { recursive: true });
});

test("calculate fingerprint all source types", async () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.txt", "Lorem Ipsum");
  writeFile("test3.txt", "Dolor sit amet");
  writeFile("test-dir/test.txt", "Hello, there!");
  writeFile("test-dir/nested/test.txt", "Sed do eiusmod tempor");

  const options: FingerprintOptions = {
    extraInputs: [
      { key: "test4", content: "Consectetur adipiscing elit" },
      { key: "test5", json: { foo: "bar", baz: 123 } },
    ],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);

  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 20b1d4f8f1816d008445f024dfd7b39521b8fecd
    Inputs:
      - CONTENT test4 - 3167fb5210b08f623c97f57ffb4903081ba4d6a5
      - DIRECTORY test-dir - cd039c372dfec21b9064d34e52b6597aeb61a9d1
          - DIRECTORY test-dir/nested - 0bc8ca4164bd8de980ae89be1e804a3ce6c26cbb
              - FILE test-dir/nested/test.txt - 4c9f5860b5fe56c5c4b7636d26dc8472ebc4dbaa
          - FILE test-dir/test.txt - f84640c76bd37e72446bc21d36613c3bb38dd788
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - FILE test2.txt - 0646164d30b3bd0023a1e6878712eb1b9b15a1da
      - FILE test3.txt - 7a967b4c4a5fdfaf7cde3a941a06b45e61e6a746
      - JSON test5 - 2e0706ddb09be38781b9b2bcc14c75d7b028ce61
    "
  `);
  expect(fingerprintSync).toEqual(fingerprint);

  const options2: FingerprintOptions = {
    include: ["test1.txt", "test2.txt", "test3.txt", "test-dir"],
    extraInputs: [
      { key: "test5", json: { baz: 123, foo: "bar" } },
      { key: "test4", content: "Consectetur adipiscing elit" },
    ],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync2 = calculateFingerprintSync(rootDir, options2);
  const fingerprint2 = await calculateFingerprint(rootDir, options2);
  expect(fingerprintSync2).toEqual(fingerprint2);
  expect(fingerprint2).toEqual(fingerprint);
});

test("calculate with include", async () => {
  writeFile("dir1/test1.txt", "Hello, world!");
  writeFile("dir1/nested/test2.txt", "Lorem Ipsum");
  writeFile("dir2/test1.txt", "Dolor sit amet");
  writeFile("dir3/test.txt", "Should be ignored");
  writeFile("dir3/nested/test.txt", "Sed do eiusmod tempor");

  const options: FingerprintOptions = {
    include: ["dir1", "dir2", "dir3/nested/test.txt"],
    hashAlgorithm: "sha1",
  }

  const fingerprint = await calculateFingerprint(rootDir, options);
  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 33c6c4d669684284db1c201a2af10a261917bfbe
    Inputs:
      - DIRECTORY dir1 - d66ef941c49da1b96fef19e64dec26ef8a1190f9
          - DIRECTORY dir1/nested - 4a20801bc04226a12b92f7a38cec316a5453f957
              - FILE dir1/nested/test2.txt - 0646164d30b3bd0023a1e6878712eb1b9b15a1da
          - FILE dir1/test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
      - DIRECTORY dir2 - 1aea45b018b7af7757b6a19f1194335dea7ec2d7
          - FILE dir2/test1.txt - 7a967b4c4a5fdfaf7cde3a941a06b45e61e6a746
      - FILE dir3/nested/test.txt - 4c9f5860b5fe56c5c4b7636d26dc8472ebc4dbaa
    "
  `);
  expect(fingerprintSync).toEqual(fingerprint);
});

test("calculate fingerprint with exclude", async () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.md", "Should be ignored");
  writeFile("ignore/test.txt", "Should be ignored");

  const options: FingerprintOptions = {
    exclude: ["ignore", "*.md"],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(fingerprintSync).toEqual(fingerprint);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 142fa232afb866d394ab59fef182fd20ac591989
    Inputs:
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);

  const options2: FingerprintOptions = {
    include: ["test1.txt", "test2.md"],
    exclude: ["ignore", "*.txt"],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync2 = calculateFingerprintSync(rootDir, options2);
  const fingerprint2 = await calculateFingerprint(rootDir, options2);
  expect(fingerprintSync2).toEqual(fingerprint2);
  expect(formatFingerprint(fingerprint2)).toMatchInlineSnapshot(`
    "Hash: b7aefca91168b26779504db21340aede606cccb9
    Inputs:
      - FILE test2.md - 7f671b304fd5b282ff7b5eaf8c761f2ff24cb3ce
    "
  `);
});

test("calculate fingerprint with include and exclude", async () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("dir/test1.txt", "Hellow world");
  writeFile("dir/test2.md", "Should be ignored");
  writeFile("ignore/test.txt", "Should be ignored");

  const options: FingerprintOptions = {
    include: ["test1.txt", "dir"],
    exclude: ["**/*.md"],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(fingerprintSync).toEqual(fingerprint);
  expect(formatFingerprint(fingerprint)).toMatchInlineSnapshot(`
    "Hash: 87b870667472bf3de5e09963c5426f796ed15824
    Inputs:
      - DIRECTORY dir - 07d9232cfda9678479c650479a5a14b873bb29bc
          - FILE dir/test1.txt - 35a883d254566ac9d9a375e5d3307fb0765d9e18
      - FILE test1.txt - 943a702d06f34599aee1f8da8ef9f7296031d699
    "
  `);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}

function formatFingerprint(fingerprint: FingerprintResult): string {
  let result = `Hash: ${fingerprint.hash}\n`;
  result += `Inputs:\n`;
  result += formatInputs(fingerprint.inputs, 2);
  return result;
}

function formatInputs(inputs: FingerprintInputHash[], indent = 0): string {
  let result = "";
  for (const input of inputs) {
    const name = input.key.split(":")[1];

    result += `${" ".repeat(indent)}- ${input.type.toUpperCase()} ${name} - ${input.hash}\n`;
    if (input.type === "directory") {
      result += formatInputs(input.children, indent + 4);
    }
  }

  return result;
}
