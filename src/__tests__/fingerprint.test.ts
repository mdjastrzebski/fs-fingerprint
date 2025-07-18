import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import { calculateFingerprint } from "../fingerprint.js";

const rootDir = path.join(os.tmpdir(), "fingerprint-test");

beforeEach(() => {
  if (fs.existsSync(rootDir)) {
    fs.rmSync(rootDir, { recursive: true });
  }

  fs.mkdirSync(rootDir, { recursive: true });
});

test("calculate fingerprint", () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.txt", "Lorem Ipsum");
  writeFile("test3.txt", "Dolor sit amet");
  writeFile("test-dir/test.txt", "Hello, there!");
  writeFile("test-dir/nested/test.txt", "Sed do eiusmod tempor");

  const fingerprint = calculateFingerprint(rootDir, {
    extraInputs: [
      { key: "test4", content: "Consectetur adipiscing elit" },
      { key: "test5", json: { foo: "bar", baz: 123 } },
    ],
    hashAlgorithm: "sha1",
  });
  expect(fingerprint.hash).toMatchInlineSnapshot(`"20b1d4f8f1816d008445f024dfd7b39521b8fecd"`);

  const fingerprint2 = calculateFingerprint(rootDir, {
    include: ["test*.txt", "test-dir"],
    extraInputs: [
      { key: "test5", json: { baz: 123, foo: "bar" } },
      { key: "test4", content: "Consectetur adipiscing elit" },
    ],
    hashAlgorithm: "sha1",
  });
  expect(fingerprint2.hash).toEqual(fingerprint.hash);
});

test("calculate fingerprint with exclude", () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.md", "Should be ignored");
  writeFile("ignore/test.txt", "Should be ignored");

  const fingerprint = calculateFingerprint(rootDir, {
    exclude: ["ignore", "*.md"],
    hashAlgorithm: "sha1",
  });
  expect(fingerprint.hash).toMatchInlineSnapshot(`"142fa232afb866d394ab59fef182fd20ac591989"`);
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

  const fingerprint2 = calculateFingerprint(rootDir, {
    include: ["*"],
    exclude: ["ignore", "*.md", "*.txt"],
    hashAlgorithm: "sha1",
  });
  expect(fingerprint2.hash).toMatchInlineSnapshot(`"(null)"`);
  expect(fingerprint2).toMatchInlineSnapshot(`
    {
      "hash": "(null)",
      "inputs": [],
    }
  `);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}
