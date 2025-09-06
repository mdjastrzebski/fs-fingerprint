import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import { calculateFingerprint, calculateFingerprintSync } from "../fingerprint.js";
import type { FingerprintInputHash, FingerprintOptions } from "../types.js";

const rootDir = path.join(os.tmpdir(), "fingerprint-test");

beforeEach(() => {
  if (fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true });
  }

  fs.mkdirSync(rootDir, { recursive: true });
});

test("calculate fingerprint", async () => {
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

  expect(flattenInputs(fingerprint.inputs)).toMatchInlineSnapshot(`
    [
      {
        "hash": "cd039c372dfec21b9064d34e52b6597aeb61a9d1",
        "key": "directory:test-dir",
      },
      {
        "hash": "0bc8ca4164bd8de980ae89be1e804a3ce6c26cbb",
        "key": "directory:test-dir/nested",
      },
      {
        "hash": "4c9f5860b5fe56c5c4b7636d26dc8472ebc4dbaa",
        "key": "file:test-dir/nested/test.txt",
      },
      {
        "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
        "key": "file:test-dir/test.txt",
      },
      {
        "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
        "key": "file:test1.txt",
      },
      {
        "hash": "0646164d30b3bd0023a1e6878712eb1b9b15a1da",
        "key": "file:test2.txt",
      },
      {
        "hash": "7a967b4c4a5fdfaf7cde3a941a06b45e61e6a746",
        "key": "file:test3.txt",
      },
      {
        "hash": "3167fb5210b08f623c97f57ffb4903081ba4d6a5",
        "key": "content:test4",
      },
      {
        "hash": "2e0706ddb09be38781b9b2bcc14c75d7b028ce61",
        "key": "json:test5",
      },
    ]
  `);
  expect(flattenInputs(fingerprintSync.inputs)).toMatchInlineSnapshot(`
    [
      {
        "hash": "cd039c372dfec21b9064d34e52b6597aeb61a9d1",
        "key": "directory:test-dir",
      },
      {
        "hash": "0bc8ca4164bd8de980ae89be1e804a3ce6c26cbb",
        "key": "directory:test-dir/nested",
      },
      {
        "hash": "4c9f5860b5fe56c5c4b7636d26dc8472ebc4dbaa",
        "key": "file:test-dir/nested/test.txt",
      },
      {
        "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
        "key": "file:test-dir/test.txt",
      },
      {
        "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
        "key": "file:test1.txt",
      },
      {
        "hash": "0646164d30b3bd0023a1e6878712eb1b9b15a1da",
        "key": "file:test2.txt",
      },
      {
        "hash": "7a967b4c4a5fdfaf7cde3a941a06b45e61e6a746",
        "key": "file:test3.txt",
      },
      {
        "hash": "3167fb5210b08f623c97f57ffb4903081ba4d6a5",
        "key": "content:test4",
      },
      {
        "hash": "2e0706ddb09be38781b9b2bcc14c75d7b028ce61",
        "key": "json:test5",
      },
    ]
  `);

  expect(fingerprintSync).toEqual(fingerprint);
  expect(fingerprint.hash).toMatchInlineSnapshot(`"20b1d4f8f1816d008445f024dfd7b39521b8fecd"`);

  const options2: FingerprintOptions = {
    include: ["test*.txt", "test-dir"],
    extraInputs: [
      { key: "test5", json: { baz: 123, foo: "bar" } },
      { key: "test4", content: "Consectetur adipiscing elit" },
    ],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync2 = calculateFingerprintSync(rootDir, options2);
  const fingerprint2 = await calculateFingerprint(rootDir, options2);
  expect(fingerprintSync2).toEqual(fingerprint2);
  expect(flattenInputs(fingerprint2.inputs)).toMatchInlineSnapshot();
  expect(fingerprint2).toEqual(fingerprint);
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
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "hash": "142fa232afb866d394ab59fef182fd20ac591989",
      "inputs": [
        {
          "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
          "key": "file:test1.txt",
          "path": "test1.txt",
          "type": "file",
        },
      ],
    }
  `);

  const options2: FingerprintOptions = {
    include: ["*"],
    exclude: ["ignore", "*.md", "*.txt"],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync2 = calculateFingerprintSync(rootDir, options2);
  const fingerprint2 = await calculateFingerprint(rootDir, options2);
  expect(fingerprintSync2).toEqual(fingerprint2);
  expect(fingerprint2).toMatchInlineSnapshot(`
    {
      "hash": "(null)",
      "inputs": [],
    }
  `);
});

test("calculate fingerprint with deep include matches", async () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.txt", "Lorem Ipsum");
  writeFile("test3.txt", "Dolor sit amet");
  writeFile("test-dir/test.txt", "Hello, there!");
  writeFile("test-dir/nested/test.txt", "Sed do eiusmod tempor");

  const options: FingerprintOptions = {
    include: ["**/*.txt"],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  expect(fingerprintSync).toEqual(fingerprint);
  expect(fingerprint.hash).toMatchInlineSnapshot(`"f252d89357cae93eb0b8c4bab6a0218a6fae8e03"`);
  expect(flattenInputs(fingerprint.inputs)).toHaveLength(7);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}

test("calculate fingerprint with deep include matches", async () => {
  writeFile("android/test1.txt", "Hello, world!");
  writeFile("android/test2.txt", "Lorem Ipsum");
  writeFile("ios/test1.txt", "Dolor sit amet");
  writeFile("src/test.txt", "Hello, there!");
  writeFile("src/nested/test.txt", "Sed do eiusmod tempor");

  const options: FingerprintOptions = {
    include: ["android/**", "ios/**"],
    hashAlgorithm: "sha1",
  }

  const fingerprintSync = calculateFingerprintSync(rootDir, options);
  const fingerprint = await calculateFingerprint(rootDir, options);
  
  expect(fingerprint.hash).toMatchInlineSnapshot(`"c1ae0dedbe8859cd167187e5f78045c074f7c0ee"`);
  expect(flattenInputs(fingerprint.inputs)).toMatchInlineSnapshot(`
    [
      {
        "hash": "e8a9a74f9282bdcf9d7456c2adef6641175b5435",
        "key": "directory:android",
      },
      {
        "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
        "key": "file:android/test1.txt",
      },
      {
        "hash": "0646164d30b3bd0023a1e6878712eb1b9b15a1da",
        "key": "file:android/test2.txt",
      },
      {
        "hash": "0aaf87d04f14698bde396411889848d503226e5e",
        "key": "directory:ios",
      },
      {
        "hash": "7a967b4c4a5fdfaf7cde3a941a06b45e61e6a746",
        "key": "file:ios/test1.txt",
      },
    ]
  `);
  expect(fingerprintSync).toEqual(fingerprint);
});

function flattenInputs(inputs: FingerprintInputHash[]): { key: string; hash: string }[] {
  const result = inputs.flatMap((input) => {
    const simpleInput = {
      key: input.key,
      hash: input.hash,
    };

    if (input.type === "directory") {
      return [simpleInput, ...flattenInputs(input.children)];
    }

    return [simpleInput];
  });

  result.sort((a, b) => a.key.split(":")[1].localeCompare(b.key.split(":")[1]));
  return result;
}
