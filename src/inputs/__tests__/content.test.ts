import { describe, expect, test } from "bun:test";

import { EMPTY_HASH } from "../../constants.js";
import type { Config } from "../../types.js";
import { calculateContentHash, envContent, jsonContent, textContent } from "../content.js";

const baseConfig: Config = {
  basePath: "not-used",
};

describe("calculateContentHash", () => {
  test("handles regular content", () => {
    const content = textContent("content-1", "Hello, world!");

    const hash = calculateContentHash(content, baseConfig);
    expect(hash).toEqual({
      hash: "943a702d06f34599aee1f8da8ef9f7296031d699",
      key: "content-1",
      content: "Hello, world!",
    });
  });

  test("handles null hash algorithm", () => {
    const content = textContent("content-1", "Hello, world!");

    const testConfig = { ...baseConfig, hashAlgorithm: "null" };
    const hash = calculateContentHash(content, testConfig);
    expect(hash).toEqual({
      hash: EMPTY_HASH,
      key: "content-1",
      content: "Hello, world!",
    });
  });

  test("handles json object", () => {
    const content = jsonContent("json-1", { foo: "bar", baz: 123 });

    const hash = calculateContentHash(content, baseConfig);
    expect(hash).toMatchInlineSnapshot(`
      {
        "content": 
      "{
        "baz": 123,
        "foo": "bar"
      }"
      ,
        "hash": "7391dce2d9080f78b92f62bb43b308a2f073b0e5",
        "key": "json-1",
      }
    `);
  });

  test("handles json array", () => {
    const content = jsonContent("json-1", [
      1,
      { foo: "bar", baz: 123 },
      "baz",
      ["nested", "array"],
    ]);

    const hash = calculateContentHash(content, baseConfig);
    expect(hash).toMatchInlineSnapshot(`
    {
      "content": 
    "[
      1,
      {
        "baz": 123,
        "foo": "bar"
      },
      "baz",
      [
        "nested",
        "array"
      ]
    ]"
    ,
      "hash": "f5dd8ef32bc7fe370c276e4347bab946aa56afd0",
      "key": "json-1",
    }
  `);
  });

  test("generates the same hash for equal object with different key order", () => {
    const content1 = jsonContent("json-1", {
      num: 123,
      str: "bar",
      bool: true,
      nul: null,
      undef: undefined,
      array: [1, 2, 3],
      obj: { foo: "bar", baz: 123 },
      nested: { obj: { foo: "zup", baz: 345 } },
    });
    const content2 = jsonContent("json-1", {
      nested: { obj: { foo: "zup", baz: 345 } },
      nul: null,
      obj: { baz: 123, foo: "bar" },
      array: [1, 2, 3],
      str: "bar",
      undef: undefined,
      num: 123,
      bool: true,
    });

    const hash = calculateContentHash(content1, baseConfig);
    const hash2 = calculateContentHash(content2, baseConfig);
    expect(hash).toEqual(hash2);
  });

  test("handles env input", () => {
    process.env["TEST_ENV_1"] = "value1";
    process.env["TEST_ENV_2"] = "value2";

    const content = envContent("env-1", ["TEST_ENV_1", "TEST_ENV_2", "TEST_ENV_3"]);

    const hash = calculateContentHash(content, baseConfig);
    expect(hash).toMatchInlineSnapshot(`
      {
        "content": 
      "{
        "TEST_ENV_1": "value1",
        "TEST_ENV_2": "value2",
        "TEST_ENV_3": ""
      }"
      ,
        "hash": "3a671da9c07c4ec27fe5a01f7dbef7b6e01dca54",
        "key": "env-1",
      }
    `);

    delete process.env["TEST_ENV_1"];
    delete process.env["TEST_ENV_2"];
  });

  test('content handles "secret" option', () => {
    const content = textContent("content-1", "MY-SECRET-CONTENT");
    const secretContent = textContent("content-1", "MY-SECRET-CONTENT", { secret: true });

    const hash = calculateContentHash(secretContent, baseConfig);
    expect(hash).toMatchInlineSnapshot(`
      {
        "content": undefined,
        "hash": "e422c1d049d179dddc0d9c81923133dfd1c43dd0",
        "key": "content-1",
      }
    `);
    expect(hash.content).toBeUndefined();

    const check = calculateContentHash(content, baseConfig);
    expect(hash.hash).toBe(check.hash);
  });
});
