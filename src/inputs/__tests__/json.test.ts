import { expect, test } from "vitest";

import type { FingerprintConfig, FingerprintJsonInput } from "../../types.js";
import { calculateJsonHash } from "../json.js";

const baseConfig: FingerprintConfig = {
  rootDir: "not-used",
};

test("calculateJsonHash handles json object", () => {
  const content: FingerprintJsonInput = { key: "json-1", json: { foo: "bar", baz: 123 } };

  const hash = calculateJsonHash(content, baseConfig);
  expect(hash).toEqual({
    hash: "2e0706ddb09be38781b9b2bcc14c75d7b028ce61",
    json: {
      baz: 123,
      foo: "bar",
    },
    key: "json:json-1",
    type: "json",
  });
});

test("calculateJsonHash handles json array", () => {
  const content: FingerprintJsonInput = {
    key: "json-1",
    json: [1, { foo: "bar", baz: 123 }, "baz", ["nested", "array"]],
  };

  const hash = calculateJsonHash(content, baseConfig);
  expect(hash).toMatchInlineSnapshot(`
    {
      "hash": "6d952fb59198645d50da66727722a90cc27e5ca3",
      "json": [
        1,
        {
          "baz": 123,
          "foo": "bar",
        },
        "baz",
        [
          "nested",
          "array",
        ],
      ],
      "key": "json:json-1",
      "type": "json",
    }
  `);
});

test("calculateJsonHash generates the same hash for equal object with different key order", () => {
  const content1: FingerprintJsonInput = {
    key: "json-1",
    json: {
      num: 123,
      str: "bar",
      bool: true,
      nul: null,
      undef: undefined,
      array: [1, 2, 3],
      obj: { foo: "bar", baz: 123 },
      nested: { obj: { foo: "zup", baz: 345 } },
    },
  };
  const content2: FingerprintJsonInput = {
    key: "json-1",
    json: {
      nested: { obj: { foo: "zup", baz: 345 } },
      nul: null,
      obj: { baz: 123, foo: "bar" },
      array: [1, 2, 3],
      str: "bar",
      undef: undefined,
      num: 123,
      bool: true,
    },
  };

  const hash = calculateJsonHash(content1, baseConfig);
  const hash2 = calculateJsonHash(content2, baseConfig);
  expect(hash).toEqual(hash2);
});

test("calculateJsonHash handles null hash algorithm", () => {
  const content: FingerprintJsonInput = { key: "json-1", json: { foo: "bar" } };

  const testConfig = { ...baseConfig, hashAlgorithm: "null" };
  const hash = calculateJsonHash(content, testConfig);
  expect(hash).toMatchInlineSnapshot(`
    {
      "hash": "(null)",
      "json": {
        "foo": "bar",
      },
      "key": "json:json-1",
      "type": "json",
    }
  `);
});
