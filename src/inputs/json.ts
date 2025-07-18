import type { FingerprintConfig, FingerprintJsonHash, FingerprintJsonInput } from "../types.js";
import { hashContent } from "../utils.js";

export function calculateJsonHash(
  input: FingerprintJsonInput,
  config: FingerprintConfig
): FingerprintJsonHash {
  const normalizedData = normalizeObject(input.json);
  const jsonString = JSON.stringify(normalizedData);

  return {
    type: "json",
    key: `json:${input.key}`,
    hash: hashContent(jsonString, config),
    json: normalizedData,
  };
}

function normalizeObject<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeObject) as T;
  }

  const sortedKeys = Object.keys(value).sort();
  const result: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    result[key] = normalizeObject((value as Record<string, unknown>)[key]);
  }

  return result as T;
}
