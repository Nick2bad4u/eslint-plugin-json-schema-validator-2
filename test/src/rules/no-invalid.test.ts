import { RuleTester } from "eslint";
import * as espree from "espree";
import * as jsonParser from "jsonc-eslint-parser";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as tomlParser from "toml-eslint-parser";
import { safeCastTo } from "ts-extras";
import * as yamlParser from "yaml-eslint-parser";

import rule from "../../../src/rules/no-invalid";
import { loadTestCases } from "../../utils/utils";

type TestedRuleModule = Parameters<RuleTester["run"]>[1];

const parserWithoutServices = {
    parseForESLint: (code: string) => ({
        ast: espree.parse(code, {
            comment: true,
            ecmaVersion: 2020,
            loc: true,
            range: true,
            sourceType: "module",
            tokens: true,
        }),
    }),
};

// eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const STATIC_JSON_MODULE_PATH = path.resolve(
    TEST_DIR,
    "../utils/http-client/get-modules/static-json.mjs"
);
const TEST_CACHE_DIR = path.resolve(
    TEST_DIR,
    "../../../.temp/no-invalid-test-cache"
);

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
    safeCastTo<TestedRuleModule>(rule),
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
                    filename: path.join(TEST_DIR, ".eslintrc.js"),
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
                    filename: path.join(TEST_DIR, ".eslintrc.json"),
                    options: [
                        {
                            mergeSchemas: true,
                            schemas: [
                                {
                                    fileMatch: [
                                        "test/src/rules/.eslintrc.json",
                                    ],
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
                    filename: path.join(TEST_DIR, "version.json"),
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
                    filename: path.join(TEST_DIR, "version.json"),
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
                    filename: path.join(TEST_DIR, "version.json"),
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
                    filename: path.join(TEST_DIR, "version.json"),
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
                    filename: path.join(TEST_DIR, "version.json"),
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
                    filename: path.join(TEST_DIR, "version.json"),
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
                    filename: path.join(TEST_DIR, ".prettierrc.toml"),
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
                {
                    code: '{ "job": { "runsOn": 42, "uses": 42 } }',
                    errors: [
                        '"job" must match exactly one schema in oneOf.',
                        '"job.runsOn" must be string.',
                        '"job.uses" must be string.',
                    ],
                    filename: path.join(TEST_DIR, "workflow.json"),
                    options: [
                        {
                            schemas: [
                                {
                                    fileMatch: ["test/src/rules/workflow.json"],
                                    schema: {
                                        properties: {
                                            job: {
                                                oneOf: [
                                                    {
                                                        properties: {
                                                            runsOn: {
                                                                type: "string",
                                                            },
                                                        },
                                                        required: ["runsOn"],
                                                        type: "object",
                                                    },
                                                    {
                                                        properties: {
                                                            uses: {
                                                                type: "string",
                                                            },
                                                        },
                                                        required: ["uses"],
                                                        type: "object",
                                                    },
                                                ],
                                            },
                                        },
                                        type: "object",
                                    },
                                },
                            ],
                            useSchemastoreCatalog: false,
                        },
                    ],
                },
                {
                    code: '{ "job": { "runsOn": 42, "uses": 42 } }',
                    errors: [
                        '"job.runsOn" must be string.',
                        '"job.uses" must be string.',
                    ],
                    filename: path.join(TEST_DIR, "workflow.json"),
                    options: [
                        {
                            reportMode: "most-specific",
                            schemas: [
                                {
                                    fileMatch: ["test/src/rules/workflow.json"],
                                    schema: {
                                        properties: {
                                            job: {
                                                oneOf: [
                                                    {
                                                        properties: {
                                                            runsOn: {
                                                                type: "string",
                                                            },
                                                        },
                                                        required: ["runsOn"],
                                                        type: "object",
                                                    },
                                                    {
                                                        properties: {
                                                            uses: {
                                                                type: "string",
                                                            },
                                                        },
                                                        required: ["uses"],
                                                        type: "object",
                                                    },
                                                ],
                                            },
                                        },
                                        type: "object",
                                    },
                                },
                            ],
                            useSchemastoreCatalog: false,
                        },
                    ],
                },
                {
                    code: [
                        "# yaml-language-server: $schema=https://example.com/yaml-comment.schema.json",
                        "email: not-email",
                        "website: nope",
                    ].join("\n"),
                    errors: [
                        '"email" must match format "email".',
                        '"website" must match format "uri".',
                    ],
                    filename: path.join(TEST_DIR, "remote-comment.yaml"),
                    languageOptions: {
                        parser: yamlParser,
                    },
                    options: [
                        {
                            useSchemastoreCatalog: false,
                        },
                    ],
                    settings: {
                        "json-schema-validator-2": {
                            cache: {
                                directory: TEST_CACHE_DIR,
                                ttl: false,
                            },
                            http: {
                                getModulePath: STATIC_JSON_MODULE_PATH,
                                requestOptions: {},
                            },
                        },
                    },
                },
            ],
            valid: [
                {
                    code: "const value = 1;",
                    filename: path.join(TEST_DIR, "CODE_OF_CONDUCT.md"),
                    languageOptions: {
                        parser: parserWithoutServices,
                    },
                },
                {
                    code: 'module.exports = { "extends": [ require.resolve("eslint-config-foo") ] }',
                    filename: path.join(TEST_DIR, ".eslintrc.js"),
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
        }
    )
);
