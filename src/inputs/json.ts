import type { FingerprintConfig, FingerprintJsonHash, FingerprintJsonInput } from "../types.js";
import { hashContent } from "../utils.js";

export function jsonInput(key: string, data: unknown): FingerprintJsonInput {
  return {
    type: "json",
    key: `json:${key}`,
    data,
  };
}

function normalizeJson(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const normalized: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    normalized[key] = normalizeJson(obj[key]);
  }

  return normalized;
}

export function hashJson(
  config: FingerprintConfig,
  input: FingerprintJsonInput
): FingerprintJsonHash {
  const normalizedData = normalizeJson(input.data);
  const jsonString = JSON.stringify(normalizedData);

  return {
    ...input,
    hash: hashContent(config, jsonString),
  };
}
