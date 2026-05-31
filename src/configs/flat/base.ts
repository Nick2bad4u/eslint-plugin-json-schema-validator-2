import type { ESLint, Linter } from "eslint";

import * as jsoncParser from "jsonc-eslint-parser";
import * as tomlParser from "toml-eslint-parser";
import * as yamlParser from "yaml-eslint-parser";

import { pluginCore } from "../../plugin-core.js";
import {
    jsonFilePatterns,
    tomlFilePatterns,
    yamlFilePatterns,
} from "./file-patterns.js";

/** Base flat config that wires parsers for structured data files. */
const base: Linter.Config[] = [
    {
        name: "json-schema-validator-2/base",
        plugins: {
            get "json-schema-validator-2"(): ESLint.Plugin {
                return pluginCore;
            },
        },
    },
    {
        files: [...jsonFilePatterns],
        languageOptions: {
            parser: jsoncParser,
        },
        name: "json-schema-validator-2/base/json",
        rules: {
            "no-unused-expressions": "off",
            "no-unused-vars": "off",
            // ESLint core rules known to cause problems with JSON.
            strict: "off",
        },
    },
    {
        files: [...yamlFilePatterns],
        languageOptions: {
            parser: yamlParser,
        },
        name: "json-schema-validator-2/base/yaml",
        rules: {
            // ESLint core rules known to cause problems with YAML.
            "no-irregular-whitespace": "off",
            "no-unused-vars": "off",
            "spaced-comment": "off",
        },
    },
    {
        files: [...tomlFilePatterns],
        languageOptions: {
            parser: tomlParser,
        },
        name: "json-schema-validator-2/base/toml",
        rules: {
            // ESLint core rules known to cause problems with TOML.
            "no-irregular-whitespace": "off",
            "spaced-comment": "off",
        },
    },
];

export default base;
