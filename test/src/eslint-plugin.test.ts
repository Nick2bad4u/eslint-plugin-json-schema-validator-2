import { ESLint } from "eslint";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as vueParser from "vue-eslint-parser";

import { structuredDataFilePatterns } from "../../src/configs/flat/file-patterns";
import plugin from "../../src/plugin";

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

const TEST_FIXTURES_ROOT = path.join(
    // eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
    fileURLToPath(new URL(".", import.meta.url)),
    "../fixtures/integrations/eslint-plugin"
);
const FULL_PIPELINE_FIXTURE_ROOT = path.join(
    TEST_FIXTURES_ROOT,
    "full-pipeline-test01"
);
const FULL_PIPELINE_EXPECTED_INVALID_FILES = [
    "src/invalid/component.vue",
    "src/invalid/config.js",
    "src/invalid/config.json",
    "src/invalid/config.json5",
    "src/invalid/config.jsonc",
    "src/invalid/config.toml",
    "src/invalid/config.yaml",
    "src/invalid/config.yml",
    "src/invalid/page.md",
] as const;
const FULL_PIPELINE_EXPECTED_VALID_FILES = [
    "src/valid/component.vue",
    "src/valid/config.js",
    "src/valid/config.json",
    "src/valid/config.json5",
    "src/valid/config.jsonc",
    "src/valid/config.toml",
    "src/valid/config.yaml",
    "src/valid/config.yml",
    "src/valid/page.md",
] as const;
const NO_INVALID_RULE_ID = "json-schema-validator-2/no-invalid";

function toFixturePath(filePath: string): string {
    return path
        .relative(FULL_PIPELINE_FIXTURE_ROOT, filePath)
        .replaceAll(path.sep, "/");
}

describe("integration with eslint-plugin-json-schema-validator-2", () => {
    it("should lint without errors with flat-config using recommended", async () => {
        expect.assertions(2);

        const engine = new ESLint({
            cwd: path.join(TEST_FIXTURES_ROOT, "flat-config-test01"),
            overrideConfig: plugin.configs.recommended,
            overrideConfigFile: true,
        });
        const results = await engine.lintFiles(["src"]);

        expect(results).toHaveLength(2);
        expect(
            results.reduce((sum, result) => sum + result.errorCount, 0)
        ).toBe(0);
    });

    it("should lint without errors with flat-config using flat/recommended (backward compatibility)", async () => {
        expect.assertions(2);

        const engine = new ESLint({
            cwd: path.join(TEST_FIXTURES_ROOT, "flat-config-test01"),
            overrideConfig: plugin.configs["flat/recommended"],
            overrideConfigFile: true,
        });
        const results = await engine.lintFiles(["src"]);

        expect(results).toHaveLength(2);
        expect(
            results.reduce((sum, result) => sum + result.errorCount, 0)
        ).toBe(0);
    });

    it("should scope the recommended validation rule to structured-data files", () => {
        expect.assertions(2);

        const recommendedRuleConfig = plugin.configs.recommended.find(
            (config) => config.rules?.[NO_INVALID_RULE_ID] !== undefined
        );

        expect(recommendedRuleConfig?.files).toStrictEqual([
            ...structuredDataFilePatterns,
        ]);
        expect(recommendedRuleConfig?.rules?.[NO_INVALID_RULE_ID]).toBe("warn");
    });

    it("should validate Markdown frontmatter through the frontmatter processor config", async () => {
        expect.assertions(3);

        const engine = new ESLint({
            cwd: TEST_FIXTURES_ROOT,
            overrideConfig: [
                ...plugin.configs.frontmatter,
                {
                    files: ["**/*.frontmatter.yaml"],
                    rules: {
                        "json-schema-validator-2/no-invalid": [
                            "error",
                            {
                                schemas: [
                                    {
                                        fileMatch: ["**/*.frontmatter.yaml"],
                                        schema: {
                                            additionalProperties: false,
                                            properties: {
                                                title: {
                                                    type: "string",
                                                },
                                            },
                                            required: ["title"],
                                            type: "object",
                                        },
                                    },
                                ],
                                useSchemastoreCatalog: false,
                            },
                        ],
                    },
                },
            ],
            overrideConfigFile: true,
        });

        const results = await engine.lintText(
            [
                "---",
                "title: 42",
                "---",
                "",
                "# Demo",
            ].join("\n"),
            { filePath: path.join(TEST_FIXTURES_ROOT, "docs/demo.md") }
        );

        expect(results).toHaveLength(1);
        expect(results[0]?.messages).toHaveLength(1);
        expect(results[0]?.messages[0]?.message).toBe(
            '"title" must be string.'
        );
    });

    it("should validate every supported file kind through flat config", async () => {
        expect.hasAssertions();

        const schema = {
            additionalProperties: false,
            properties: {
                flag: {
                    type: "string",
                },
            },
            required: ["flag"],
            type: "object",
        } as const;
        const engine = new ESLint({
            cwd: TEST_FIXTURES_ROOT,
            overrideConfig: [
                ...plugin.configs.frontmatter,
                {
                    files: ["**/*.vue"],
                    languageOptions: {
                        parser: vueParser,
                    },
                },
                {
                    rules: {
                        "json-schema-validator-2/no-invalid": [
                            "error",
                            {
                                schemas: [
                                    {
                                        fileMatch: [
                                            "**/*.json",
                                            "**/*.jsonc",
                                            "**/*.json5",
                                            "**/*.yaml",
                                            "**/*.yml",
                                            "**/*.toml",
                                            "**/*.js",
                                            "**/*.frontmatter.yaml",
                                            "**/*blockType=i18n*",
                                        ],
                                        schema,
                                    },
                                ],
                                useSchemastoreCatalog: false,
                            },
                        ],
                    },
                },
            ],
            overrideConfigFile: true,
        });
        const cases = [
            [
                "component.vue",
                [
                    "<i18n>",
                    '{ "flag": 1 }',
                    "</i18n>",
                    "",
                ].join("\n"),
            ],
            ["config.js", "module.exports = { flag: 1 };\n"],
            ["config.json5", "{ flag: 1 }"],
            ["config.json", '{ "flag": 1 }'],
            ["config.jsonc", '{\n  // comment\n  "flag": 1\n}'],
            ["config.toml", "flag = 1\n"],
            ["config.yaml", "flag: 1\n"],
            ["config.yml", "flag: 1\n"],
            [
                "page.md",
                [
                    "---",
                    "flag: 1",
                    "---",
                    "",
                    "# Page",
                ].join("\n"),
            ],
        ] as const;

        for (const [filename, code] of cases) {
            const results = await engine.lintText(code, {
                filePath: path.join(TEST_FIXTURES_ROOT, filename),
            });

            expect(results[0]?.messages).toContainEqual(
                expect.objectContaining({
                    message: '"flag" must be string.',
                    ruleId: "json-schema-validator-2/no-invalid",
                })
            );
        }
    });

    it("should validate every supported file kind from a real fixture tree", async () => {
        expect.hasAssertions();

        const engine = new ESLint({
            cwd: FULL_PIPELINE_FIXTURE_ROOT,
            overrideConfig: [
                ...plugin.configs.frontmatter,
                {
                    files: ["**/*.vue"],
                    languageOptions: {
                        parser: vueParser,
                    },
                },
                {
                    rules: {
                        "json-schema-validator-2/no-invalid": [
                            "error",
                            {
                                schemas: [
                                    {
                                        fileMatch: [
                                            "src/**/*.json",
                                            "src/**/*.jsonc",
                                            "src/**/*.json5",
                                            "src/**/*.yaml",
                                            "src/**/*.yml",
                                            "src/**/*.toml",
                                            "src/**/*.js",
                                            "**/*.frontmatter.yaml",
                                            "**/*blockType=i18n*",
                                        ],
                                        schema: "schemas/strict-flag.schema.json",
                                    },
                                ],
                                useSchemastoreCatalog: false,
                            },
                        ],
                    },
                },
            ],
            overrideConfigFile: true,
        });
        const results = await engine.lintFiles(["src"]);
        const resultsByPath = new Map(
            results.map((result) => [toFixturePath(result.filePath), result])
        );
        const expectedFiles = [
            ...FULL_PIPELINE_EXPECTED_INVALID_FILES,
            ...FULL_PIPELINE_EXPECTED_VALID_FILES,
        ] as const;
        const expectedFileSet = new Set<string>(expectedFiles);

        expect(resultsByPath.size).toBe(expectedFiles.length);

        for (const filePath of resultsByPath.keys()) {
            expect(expectedFileSet.has(filePath)).toBe(true);
        }

        for (const filePath of FULL_PIPELINE_EXPECTED_INVALID_FILES) {
            expect(resultsByPath.get(filePath)?.messages).toContainEqual(
                expect.objectContaining({
                    message: '"flag" must be string.',
                    ruleId: "json-schema-validator-2/no-invalid",
                    severity: 2,
                })
            );
        }

        for (const filePath of FULL_PIPELINE_EXPECTED_VALID_FILES) {
            expect(resultsByPath.get(filePath)?.messages).toStrictEqual([]);
        }
    });
});
