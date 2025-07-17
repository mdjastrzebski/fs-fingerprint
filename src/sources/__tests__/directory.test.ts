import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

import type { FingerprintConfig } from "../../types.js";
import { directorySource, hashDirectorySource } from "../directory.js";

const config: FingerprintConfig = {
  rootDir: path.join(os.tmpdir(), "directory-test"),
  excludes: [],
  hashAlgorithm: "sha1",
};

beforeEach(() => {
  if (fs.existsSync(config.rootDir)) {
    fs.rmSync(config.rootDir, { recursive: true });
  }

  fs.mkdirSync(config.rootDir, { recursive: true });
});

test("hash directory source", () => {
  writeFile("test-dir/test.txt", "Hello, world!");

  const fingerprint = hashDirectorySource(config, directorySource("test-dir"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
          "source": {
            "key": "file:test-dir/test.txt",
            "path": "test-dir/test.txt",
            "type": "file",
          },
        },
      ],
      "hash": "b0525e564d1cc96ceb59b55150e30f51bb0600c9",
      "source": {
        "key": "directory:test-dir",
        "path": "test-dir",
        "type": "directory",
      },
    }
  `);
});

test("hash directory source with nesting", () => {
  writeFile("test-dir/test.txt", "Hello, world!");
  writeFile("test-dir/nested/test.txt", "Hello, there!");

  const fingerprint = hashDirectorySource(config, directorySource("test-dir"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "children": [
            {
              "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
              "source": {
                "key": "file:test-dir/nested/test.txt",
                "path": "test-dir/nested/test.txt",
                "type": "file",
              },
            },
          ],
          "hash": "e765acb113f5393fe1baa2f0d9bb1e8de1d04523",
          "source": {
            "key": "directory:test-dir/nested",
            "path": "test-dir/nested",
            "type": "directory",
          },
        },
        {
          "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
          "source": {
            "key": "file:test-dir/test.txt",
            "path": "test-dir/test.txt",
            "type": "file",
          },
        },
      ],
      "hash": "53abd16e171d5374d110a5e6756be51e01def412",
      "source": {
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
    excludes: ["**/ignored", "*.md"],
  };

  const fingerprint = hashDirectorySource(config2, directorySource("test-dir"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [
        {
          "children": [
            {
              "hash": "f84640c76bd37e72446bc21d36613c3bb38dd788",
              "source": {
                "key": "file:test-dir/nested/test.txt",
                "path": "test-dir/nested/test.txt",
                "type": "file",
              },
            },
          ],
          "hash": "e765acb113f5393fe1baa2f0d9bb1e8de1d04523",
          "source": {
            "key": "directory:test-dir/nested",
            "path": "test-dir/nested",
            "type": "directory",
          },
        },
        {
          "hash": "ac1b00033bb1fee6c174dcedbed0cf1994b02b47",
          "source": {
            "key": "file:test-dir/test.md",
            "path": "test-dir/test.md",
            "type": "file",
          },
        },
        {
          "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
          "source": {
            "key": "file:test-dir/test.txt",
            "path": "test-dir/test.txt",
            "type": "file",
          },
        },
      ],
      "hash": "7a306094610251c40f467a8c3cd418b75295b1e8",
      "source": {
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
    excludes: ["ignore/*"],
  };

  const fingerprint = hashDirectorySource(config2, directorySource("."));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "children": [],
      "hash": null,
      "source": {
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
