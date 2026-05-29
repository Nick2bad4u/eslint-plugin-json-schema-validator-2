import { ESLint } from "eslint";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import plugin from "../../src/plugin";

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

const TEST_FIXTURES_ROOT = path.join(
    // eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
    fileURLToPath(new URL(".", import.meta.url)),
    "../fixtures/integrations/eslint-plugin"
);

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
});
