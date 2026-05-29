import { RuleTester } from "eslint";
import * as espree from "espree";
import * as jsonParser from "jsonc-eslint-parser";
import path from "node:path";
import * as tomlParser from "toml-eslint-parser";

import rule from "../../../src/rules/no-invalid.ts";
import { loadTestCases } from "../../utils/utils.ts";

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    /* eslint @typescript-eslint/no-require-imports: 0 -- ignore */
    parser: jsonParser,
    sourceType: "module",
  },
});

tester.run(
  "no-invalid",
  rule as any,
  loadTestCases(
    "no-invalid",
    {},
    {
      invalid: [
        {
          code: '{ "extends": [ 42 ] }',
          errors: [
            '"extends" must be string.',
            '"extends" must match exactly one schema in oneOf.',
            '"extends[0]" must be string.',
          ],
          filename: ".eslintrc.json",
        },
        {
          code: '{ "extends": [ 42 ] }',
          errors: [
            '"extends" must be string.',
            '"extends" must match exactly one schema in oneOf.',
            '"extends[0]" must be string.',
          ],
          filename: ".eslintrc.json",
          options: [
            {
              schemas: [
                {
                  fileMatch: [".eslintrc.*"],
                  schema: "https://www.schemastore.org/eslintrc",
                },
              ],
            },
          ],
        },
        {
          code: 'module.exports = { "extends": [ 42 ] }',
          errors: [
            '"extends" must be string.',
            '"extends" must match exactly one schema in oneOf.',
            '"extends[0]" must be string.',
          ],
          filename: path.join(
            import.meta.dirname,
            ".eslintrc.js",
          ),
          languageOptions: {
            parser: espree,
          },
          options: [
            {
              schemas: [
                {
                  fileMatch: ["test/src/rules/.eslintrc.js"],
                  schema: "https://www.schemastore.org/eslintrc",
                },
              ],
              useSchemastoreCatalog: false,
            },
          ],
        },
        {
          code: '{ "extends": [ 98 ], "$schema": "https://www.schemastore.org/eslintrc" }',
          errors: [
            "Root must have required property 'foo'.",
            '"extends" must be string.',
            '"extends" must match exactly one schema in oneOf.',
            '"extends[0]" must be string.',
          ],
          filename: path.join(
            import.meta.dirname,
            ".eslintrc.json",
          ),
          options: [
            {
              mergeSchemas: true,
              schemas: [
                {
                  fileMatch: ["test/src/rules/.eslintrc.json"],
                  schema: {
                    properties: {
                      foo: {
                        type: "number",
                      },
                    },
                    required: ["foo"],
                  },
                },
              ],
              useSchemastoreCatalog: false,
            },
          ],
        },
        {
          code: '{ "extends": [ 99 ], "$schema": "https://www.schemastore.org/eslintrc" }',
          errors: [
            "Root must have required property 'foo'.",
            "Root must have required property 'version'.",
            "Root must have required property 'inherit'.",
            "Root must match a schema in anyOf.",
            '"extends" must be string.',
            '"extends" must match exactly one schema in oneOf.',
            '"extends[0]" must be string.',
          ],
          filename: path.join(
            import.meta.dirname,
            "version.json",
          ),
          options: [
            {
              mergeSchemas: true,
              schemas: [
                {
                  fileMatch: ["test/src/rules/version.json"],
                  schema: {
                    properties: {
                      foo: {
                        type: "number",
                      },
                    },
                    required: ["foo"],
                  },
                },
              ],
              useSchemastoreCatalog: true,
            },
          ],
        },
        {
          code: '{ "extends": [ 100 ], "$schema": "https://www.schemastore.org/eslintrc" }',
          errors: [
            "Root must have required property 'foo'.",
            "Root must have required property 'version'.",
            "Root must have required property 'inherit'.",
            "Root must match a schema in anyOf.",
          ],
          filename: path.join(
            import.meta.dirname,
            "version.json",
          ),
          options: [
            {
              mergeSchemas: ["catalog", "options"],
              schemas: [
                {
                  fileMatch: ["test/src/rules/version.json"],
                  schema: {
                    properties: {
                      foo: {
                        type: "number",
                      },
                    },
                    required: ["foo"],
                  },
                },
              ],
              useSchemastoreCatalog: true,
            },
          ],
        },
        {
          code: '{ "extends": [ 101 ], "$schema": "https://www.schemastore.org/eslintrc" }',
          errors: [
            "Root must have required property 'foo'.",
            '"extends" must be string.',
            '"extends" must match exactly one schema in oneOf.',
            '"extends[0]" must be string.',
          ],
          filename: path.join(
            import.meta.dirname,
            "version.json",
          ),
          options: [
            {
              mergeSchemas: ["$schema", "options"],
              schemas: [
                {
                  fileMatch: ["test/src/rules/version.json"],
                  schema: {
                    properties: {
                      foo: {
                        type: "number",
                      },
                    },
                    required: ["foo"],
                  },
                },
              ],
              useSchemastoreCatalog: true,
            },
          ],
        },
        {
          code: '{ "extends": [ 102 ], "$schema": "https://www.schemastore.org/eslintrc" }',
          errors: [
            '"extends" must be string.',
            '"extends" must match exactly one schema in oneOf.',
            '"extends[0]" must be string.',
          ],
          filename: path.join(
            import.meta.dirname,
            "version.json",
          ),
          options: [
            {
              mergeSchemas: ["$schema", "catalog"],
              schemas: [
                {
                  fileMatch: ["test/src/rules/version.json"],
                  schema: {
                    properties: {
                      foo: {
                        type: "number",
                      },
                    },
                    required: ["foo"],
                  },
                },
              ],
              useSchemastoreCatalog: false,
            },
          ],
        },
        {
          code: '{ "extends": [ 103 ], "$schema": "https://www.schemastore.org/eslintrc" }',
          errors: ["Root must have required property 'foo'."],
          filename: path.join(
            import.meta.dirname,
            "version.json",
          ),
          options: [
            {
              mergeSchemas: ["options", "catalog"],
              schemas: [
                {
                  fileMatch: ["test/src/rules/version.json"],
                  schema: {
                    properties: {
                      foo: {
                        type: "number",
                      },
                    },
                    required: ["foo"],
                  },
                },
              ],
              useSchemastoreCatalog: false,
            },
          ],
        },
        {
          code: '{ "extends": [ 104 ], "$schema": "https://www.schemastore.org/eslintrc" }',
          errors: [
            '"extends" must be string.',
            '"extends" must match exactly one schema in oneOf.',
            '"extends[0]" must be string.',
          ],
          filename: path.join(
            import.meta.dirname,
            "version.json",
          ),
          options: [
            {
              mergeSchemas: ["options", "catalog"],
              useSchemastoreCatalog: false,
            },
          ],
        },
        {
          code: `
trailingComma = "es3"
tabWidth = 4
semi = false
singleQuote = true`,
          errors: [
            '"trailingComma" must be equal to "all".',
            '"trailingComma" must be equal to "es5".',
            '"trailingComma" must be equal to "none".',
            '"trailingComma" must match exactly one schema in oneOf.',
            "Root must be string.",
            "Root must match exactly one schema in oneOf.",
          ],
          filename: path.join(
            import.meta.dirname,
            ".prettierrc.toml",
          ),
          languageOptions: {
            parser: tomlParser,
          },
          options: [
            {
              schemas: [
                {
                  fileMatch: [".prettierrc.toml"],
                  schema: "https://www.schemastore.org/prettierrc",
                },
              ],
              useSchemastoreCatalog: false,
            },
          ],
        },
      ],
      valid: [
        {
          code: 'module.exports = { "extends": [ require.resolve("eslint-config-foo") ] }',
          filename: path.join(
            import.meta.dirname,
            ".eslintrc.js",
          ),
          languageOptions: {
            parser: espree,
          },
          options: [
            {
              schemas: [
                {
                  fileMatch: ["test/src/rules/.eslintrc.js"],
                  schema: "https://www.schemastore.org/eslintrc",
                },
              ],
              useSchemastoreCatalog: false,
            },
          ],
        },
      ],
    },
  ),
);
