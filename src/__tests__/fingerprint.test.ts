import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import { calculateFingerprint } from "../fingerprint.js";
import { contentSource } from "../sources/content.js";
import { directorySource } from "../sources/directory.js";
import { fileSource } from "../sources/file.js";
import type { FingerprintConfig } from "../types.js";

const config: FingerprintConfig = {
  rootDir: path.join(os.tmpdir(), "fingerprint-test"),
  ignorePaths: [],
  hashAlgorithm: "sha1",
};

beforeEach(() => {
  if (fs.existsSync(config.rootDir)) {
    fs.rmSync(config.rootDir, { recursive: true });
  }

  fs.mkdirSync(config.rootDir, { recursive: true });
});

test("calculate fingerprint", () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.txt", "Lorem Ipsum");
  writeFile("test3.txt", "Dolor sit amet");
  writeFile("test-dir/test.txt", "Hello, there!");
  writeFile("test-dir/nested/test.txt", "Sed do eiusmod tempor");

  const fingerprint = calculateFingerprint({
    ...config,
    sources: [
      contentSource("test4", "Consectetur adipiscing elit"),
      directorySource("test-dir"),
      fileSource("test1.txt"),
      fileSource("test2.txt"),
      fileSource("test3.txt"),
    ],
  });

  expect(fingerprint.hash).toMatchInlineSnapshot(`"65a2bfbacf6bb805cd3144c03cb4dd2e2806e0a8"`);

  const fingerprint2 = calculateFingerprint({
    ...config,
    sources: [
      fileSource("test3.txt"),
      directorySource("test-dir"),
      fileSource("test1.txt"),
      contentSource("test4", "Consectetur adipiscing elit"),
      fileSource("test2.txt"),
    ],
  });
  expect(fingerprint2.hash).toEqual(fingerprint.hash);
});

test("calculate fingerprint with ignored paths", () => {
  writeFile("test1.txt", "Hello, world!");
  writeFile("test2.md", "Should be ignored");
  writeFile("ignore/test.txt", "Should be ignored");

  const fingerprint = calculateFingerprint({
    ...config,
    sources: [directorySource(".")],
    ignorePaths: ["ignore", "*.md"],
  });

  expect(fingerprint.hash).toMatchInlineSnapshot(`"0f92aaea73aa107608b34df8a98728679742cca7"`);

  const fingerprint2 = calculateFingerprint({
    ...config,
    sources: [directorySource(".")],
    ignorePaths: ["ignore", "*.md", "*.txt"],
  });
  expect(fingerprint2.hash).toMatchInlineSnapshot(`"0cf5e904cde3056eccd2b543c79df38969017f30"`);
  expect(fingerprint2).toMatchInlineSnapshot(`
    {
      "hash": "0cf5e904cde3056eccd2b543c79df38969017f30",
      "sources": [
        {
          "children": [
            {
              "children": [
                {
                  "hash": "7f671b304fd5b282ff7b5eaf8c761f2ff24cb3ce",
                  "source": {
                    "key": "file:ignore/test.txt",
                    "path": "ignore/test.txt",
                    "type": "file",
                  },
                },
              ],
              "hash": "cdb78b9c69971da98d764aa0a74a148641427b16",
              "source": {
                "key": "directory:ignore",
                "path": "ignore",
                "type": "directory",
              },
            },
          ],
          "hash": "370be3f3d5be4018d7219726c2aaff1355e62a3f",
          "source": {
            "key": "directory:.",
            "path": ".",
            "type": "directory",
          },
        },
      ],
    }
  `);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(config.rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}
