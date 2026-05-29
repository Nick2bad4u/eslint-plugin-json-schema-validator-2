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
});
