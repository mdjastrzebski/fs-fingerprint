import eslint from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["dist/", "benchmarks/repos/"],
  },
  {
    languageOptions: { globals: globals.node },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["**/*.{js,ts}"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
        },
      ],
      "simple-import-sort/imports": [
        "error",
        {
          groups: [["^\\u0000", "^node:", "^@?\\w", "^"], ["^\\."]],
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "describe", property: "only" },
        { object: "describe", property: "skip" },
        { object: "it", property: "only" },
        { object: "it", property: "skip" },
        { object: "test", property: "only" },
        { object: "test", property: "skip" },
      ],
    },
  },
];
