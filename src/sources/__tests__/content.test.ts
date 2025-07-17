import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

import type { FingerprintConfig } from "../../types.js";
import { contentSource, hashContentSource } from "../content.js";

const config: FingerprintConfig = {
  rootDir: path.join(os.tmpdir(), "content-test"),
  exclude: [],
  hashAlgorithm: "sha1",
};

test("hash content source", () => {
  const fingerprint = hashContentSource(config, contentSource("test", "Hello, world!"));
  expect(fingerprint).toMatchInlineSnapshot(`
    {
      "hash": "943a702d06f34599aee1f8da8ef9f7296031d699",
      "source": {
        "content": "Hello, world!",
        "key": "content:test",
        "type": "content",
      },
    }
  `);
});
