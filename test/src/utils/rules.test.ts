import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import type { RuleModule } from "../../../src/types";

import { rules as allRules } from "../../../src/utils/rules";

/**
 * Get the list of rules placed in the directory.
 */
async function getDirRules(): Promise<Record<string, RuleModule>> {
    const rules: Record<string, RuleModule> = {};

    const rulesRoot = path.resolve(
        // eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
        fileURLToPath(new URL(".", import.meta.url)),
        "../../../src/rules"
    );
    for (const filename of fs
        .readdirSync(rulesRoot)
        .filter((n) => n.endsWith(".ts"))) {
        const ruleName = filename.replace(/\.ts$/v, "");
        const ruleId = `json-schema-validator-2/${ruleName}`;

        const ruleModuleUrl = pathToFileURL(
            path.join(rulesRoot, filename)
        ).href;
        const importedRuleModule =
            // eslint-disable-next-line no-unsanitized/method -- Test code imports repository-owned rule modules discovered from the checked-in src/rules directory.
            (await import(ruleModuleUrl)) as unknown;
        const ruleModule = importedRuleModule as { default: RuleModule };
        rules[ruleId] = ruleModule.default;
    }

    return rules;
}

const dirRules = await getDirRules();
const dirRuleEntries = Object.entries(dirRules);
const messageCases = allRules.flatMap((rule) =>
    Object.entries(rule.meta.messages).map(([messageId, message]) => ({
        message,
        messageId,
        ruleId: rule.meta.docs.ruleId,
    }))
);

describe("check that all the rules have the correct names.", () => {
    it.each(dirRuleEntries)("%s", (ruleId, rule) => {
        expect.assertions(3);

        expect(rule).toBeDefined();
        expect(rule.meta.docs.ruleId).toBe(ruleId);
        expect(rule.meta.docs.ruleId).not.toBe("");
    });
});

describe("check if the strict of all rules is correct", () => {
    it("rule count equals", () => {
        expect.assertions(2);

        const dirRuleCount = Object.keys(dirRules).length;

        expect(allRules).toHaveLength(dirRuleCount);
        expect(allRules).not.toHaveLength(0);
    });

    it.each(allRules)("$meta.docs.ruleId", (rule) => {
        expect.assertions(4);

        expect(rule.meta.docs.ruleId).not.toBe("");
        expect(rule.meta.docs.ruleName).not.toBe("");
        expect(dirRules[rule.meta.docs.ruleId]).toBeDefined();
        expect(Object.hasOwn(dirRules, rule.meta.docs.ruleId)).toBe(true);
    });

    it.each(messageCases)(
        "$ruleId message $messageId ends with a complete sentence marker",
        ({ message }) => {
            expect.assertions(2);

            expect(message).not.toBe("");
            expect(message.endsWith(".") || message.endsWith("}}")).toBe(true);
        }
    );
});
