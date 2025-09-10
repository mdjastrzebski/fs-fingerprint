import { expect, test } from "vitest";

import { hashContent } from "../utils.js";

const baseConfig = {
  rootDir: "not-used",
};

test("hashContent handles base case", () => {
  const hash = hashContent("Hello, world!", baseConfig);
  expect(hash).toMatchInlineSnapshot(`"943a702d06f34599aee1f8da8ef9f7296031d699"`);
});

test("hashContent handle null algorithm", () => {
  const hash = hashContent("Hello, world!", { ...baseConfig, hashAlgorithm: "null" });
  expect(hash).toEqual("(null)");
});
