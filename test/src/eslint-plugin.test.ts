import { ESLint } from "eslint";
import assert from "node:assert";
import path from "node:path";
import { describe, it } from "vitest";

import plugin from "../../src/index.ts";

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

const TEST_FIXTURES_ROOT = path.join(
    import.meta.dirname,
    "../fixtures/integrations/eslint-plugin"
);

describe("integration with eslint-plugin-json-schema-validator-2", () => {
    it("should lint without errors with flat-config using recommended", async () => {
        const engine = new ESLint({
            cwd: path.join(TEST_FIXTURES_ROOT, "flat-config-test01"),
            overrideConfig: plugin.configs.recommended,
            overrideConfigFile: true,
        });
        const results = await engine.lintFiles(["src"]);
        assert.strictEqual(results.length, 2);
        assert.strictEqual(
            results.reduce((s, r) => s + r.errorCount, 0),
            0
        );
    });

    it("should lint without errors with flat-config using flat/recommended (backward compatibility)", async () => {
        const engine = new ESLint({
            cwd: path.join(TEST_FIXTURES_ROOT, "flat-config-test01"),
            overrideConfig: plugin.configs["flat/recommended"],
            overrideConfigFile: true,
        });
        const results = await engine.lintFiles(["src"]);
        assert.strictEqual(results.length, 2);
        assert.strictEqual(
            results.reduce((s, r) => s + r.errorCount, 0),
            0
        );
    });
});
