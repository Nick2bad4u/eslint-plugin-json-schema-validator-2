import type { ESLint, Linter } from "eslint";

import * as jsoncParser from "jsonc-eslint-parser";
import * as tomlParser from "toml-eslint-parser";
import * as yamlParser from "yaml-eslint-parser";

import plugin from "../../plugin.ts";

const base: Linter.Config[] = [
  {
    plugins: {

      get "json-schema-validator-2"(): ESLint.Plugin {
        return plugin;
      },
    },
  },
  {
    files: [
      "*.json",
      "**/*.json",
      "*.json5",
      "**/*.json5",
      "*.jsonc",
      "**/*.jsonc",
    ],
    languageOptions: {
      parser: jsoncParser,
    },
    rules: {
      "no-unused-expressions": "off",
      "no-unused-vars": "off",
      // ESLint core rules known to cause problems with JSON.
      strict: "off",
    },
  },
  {
    files: ["*.yaml", "**/*.yaml", "*.yml", "**/*.yml"],
    languageOptions: {
      parser: yamlParser,
    },
    rules: {
      // ESLint core rules known to cause problems with YAML.
      "no-irregular-whitespace": "off",
      "no-unused-vars": "off",
      "spaced-comment": "off",
    },
  },
  {
    files: ["*.toml", "**/*.toml"],
    languageOptions: {
      parser: tomlParser,
    },
    rules: {
      // ESLint core rules known to cause problems with TOML.
      "no-irregular-whitespace": "off",
      "spaced-comment": "off",
    },
  },
];

export default base;
