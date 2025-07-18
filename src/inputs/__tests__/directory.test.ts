import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import type { FingerprintConfig } from "../../types.js";
import { directoryInput, hashDirectoryInput } from "../directory.js";

const config: FingerprintConfig = {
  rootDir: path.join(os.tmpdir(), "directory-test"),
  exclude: [],
  hashAlgorithm: "sha1",
};

beforeEach(() => {
  if (fs.existsSync(config.rootDir)) {
    fs.rmSync(config.rootDir, { recursive: true });
  }

  fs.mkdirSync(config.rootDir, { recursive: true });
});

test("hash directory input", () => {
  writeFile("test-dir/test.txt", "Hello, world!");

  const fingerprint = hashDirectoryInput(config, directoryInput("test-dir"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
          "input": {
            "key": "file:test-dir/test.txt",
            "path": "test-dir/test.txt",
            "type": "file",
          },
        },
      ],
      "hash": "b0525e564d1cc96ceb59b55150e30f51bb0600c9",
      "input": {
        "key": "directory:test-dir",
        "path": "test-dir",
        "type": "directory",
      },
    }
  `);
});

test("hash directory input with nesting", () => {
  writeFile("test-dir/test.txt", "Hello, world!");
  writeFile("test-dir/nested/test.txt", "Hello, there!");

  const fingerprint = hashDirectoryInput(config, directoryInput("test-dir"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "children": [
            {
              "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
              "input": {
                "key": "file:test-dir/nested/test.txt",
                "path": "test-dir/nested/test.txt",
                "type": "file",
              },
            },
          ],
          "hash": "e765acb113f5393fe1baa2f0d9bb1e8de1d04523",
          "input": {
            "key": "directory:test-dir/nested",
            "path": "test-dir/nested",
            "type": "directory",
          },
        },
        {
          "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
          "input": {
            "key": "file:test-dir/test.txt",
            "path": "test-dir/test.txt",
            "type": "file",
          },
        },
      ],
      "hash": "53abd16e171d5374d110a5e6756be51e01def412",
      "input": {
        "key": "directory:test-dir",
        "path": "test-dir",
        "type": "directory",
      },
    }
  `);
});

test("hash directory excludes ignored paths", () => {
  writeFile("test-dir/test.txt", "Hello, world!");
  writeFile("test-dir/test.md", "This should be ignored");
  writeFile("test-dir/nested/test.txt", "Hello, there!");
  writeFile("test-dir/ignored/test.txt", "This should be ignored");
  writeFile("test-dir/ignored/test2", "This should be ignored");

  const config2: FingerprintConfig = {
    ...config,
    exclude: ["**/ignored", "*.md"],
  };

  const fingerprint = hashDirectoryInput(config2, directoryInput("test-dir"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "children": [
            {
              "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
              "input": {
                "key": "file:test-dir/nested/test.txt",
                "path": "test-dir/nested/test.txt",
                "type": "file",
              },
            },
          ],
          "hash": "e765acb113f5393fe1baa2f0d9bb1e8de1d04523",
          "input": {
            "key": "directory:test-dir/nested",
            "path": "test-dir/nested",
            "type": "directory",
          },
        },
        {
          "hash": "ac1b00033bb1fee6c174dcedbed0cf1994b02b47",
          "input": {
            "key": "file:test-dir/test.md",
            "path": "test-dir/test.md",
            "type": "file",
          },
        },
        {
          "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
          "input": {
            "key": "file:test-dir/test.txt",
            "path": "test-dir/test.txt",
            "type": "file",
          },
        },
      ],
      "hash": "7a306094610251c40f467a8c3cd418b75295b1e8",
      "input": {
        "key": "directory:test-dir",
        "path": "test-dir",
        "type": "directory",
      },
    }
  `);
});

test("hash directory handles negative ignore paths", () => {
  writeFile("ignore/test.md", "Hello, world!");

  const config2: FingerprintConfig = {
    ...config,
    exclude: ["ignore/*"],
  };

  const fingerprint = hashDirectoryInput(config2, directoryInput("."));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [],
      "hash": null,
      "input": {
        "key": "directory:.",
        "path": ".",
        "type": "directory",
      },
    }
  `);
});

function writeFile(filePath: string, content: string) {
  const absoluteFilePath = path.join(config.rootDir, filePath);
  const absoluteDirPath = path.dirname(absoluteFilePath);
  fs.mkdirSync(absoluteDirPath, { recursive: true });
  fs.writeFileSync(absoluteFilePath, content);
}
