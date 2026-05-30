import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { RuleModule } from "../../src/types";

import plugin from "../../src/plugin";

const packageJson = JSON.parse(
    fs.readFileSync(
        fileURLToPath(new URL("../../package.json", import.meta.url))
    ) as unknown as string
) as { version: string };
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const expectedMeta = {
    name: "eslint-plugin-json-schema-validator-2",
    namespace: "json-schema-validator-2",
    version: packageJson.version,
};
const ruleEntries = Object.entries(plugin.rules) as [string, RuleModule][];

interface RuleMetadataProblems {
    emptyDescriptionRules: string[];
    emptyMessagesRules: string[];
    emptyMessageTextRules: string[];
    invalidDefaultOptionRules: string[];
    invalidDocsRules: string[];
    invalidFixableRules: string[];
    invalidSuggestionRules: string[];
    invalidTypeRules: string[];
    missingDocsFiles: string[];
    missingSchemaRules: string[];
}

function collectRuleMetadataProblems(): RuleMetadataProblems {
    return {
        emptyDescriptionRules: ruleEntries
            .filter(
                ([, ruleModule]) =>
                    ruleModule.meta.docs.description.trim().length === 0
            )
            .map(getRuleName),
        emptyMessagesRules: ruleEntries
            .filter(
                ([, ruleModule]) =>
                    Object.keys(ruleModule.meta.messages).length === 0
            )
            .map(getRuleName),
        emptyMessageTextRules: ruleEntries
            .filter(([, ruleModule]) =>
                Object.values(ruleModule.meta.messages).some(
                    (message) => message.trim().length === 0
                )
            )
            .map(getRuleName),
        invalidDefaultOptionRules: ruleEntries
            .filter(
                ([, ruleModule]) =>
                    ruleModule.meta.defaultOptions !== undefined &&
                    !Array.isArray(ruleModule.meta.defaultOptions)
            )
            .map(getRuleName),
        invalidDocsRules: ruleEntries
            .filter((ruleEntry) => !hasValidDocsMetadata(ruleEntry))
            .map(getRuleName),
        invalidFixableRules: ruleEntries
            .filter(
                ([, ruleModule]) =>
                    ruleModule.meta.fixable !== undefined &&
                    !["code", "whitespace"].includes(ruleModule.meta.fixable)
            )
            .map(getRuleName),
        invalidSuggestionRules: ruleEntries
            .filter(
                ([, ruleModule]) => ruleModule.meta.hasSuggestions === false
            )
            .map(getRuleName),
        invalidTypeRules: ruleEntries
            .filter(
                ([, ruleModule]) =>
                    !/^(?:layout|problem|suggestion)$/v.test(
                        ruleModule.meta.type
                    )
            )
            .map(getRuleName),
        missingDocsFiles: ruleEntries
            .filter((ruleEntry) => !hasDocsFile(ruleEntry))
            .map(getRuleName),
        missingSchemaRules: ruleEntries
            .filter(([, ruleModule]) => ruleModule.meta.schema === undefined)
            .map(getRuleName),
    };
}

function getExpectedDocsUrl(ruleName: string): string {
    return `https://nick2bad4u.github.io/eslint-plugin-json-schema-validator-2/docs/rules/${ruleName}`;
}

function getRuleKeys(rules: unknown): string[] {
    return typeof rules === "object" && rules !== null
        ? Object.keys(rules)
        : [];
}

function getRuleName([ruleName]: readonly [string, RuleModule]): string {
    return ruleName;
}

function hasDocsFile([ruleName]: readonly [string, RuleModule]): boolean {
    return fs.existsSync(path.join(repoRoot, "docs/rules", `${ruleName}.md`));
}

function hasValidDocsMetadata([ruleName, ruleModule]: readonly [
    string,
    RuleModule,
]): boolean {
    const ruleId = `${expectedMeta.namespace}/${ruleName}`;

    return (
        ruleModule.meta.docs.ruleName === ruleName &&
        ruleModule.meta.docs.ruleId === ruleId &&
        ruleModule.meta.docs.url === getExpectedDocsUrl(ruleName)
    );
}

describe("test for meta object", () => {
    it("a plugin should have a meta object.", () => {
        expect.assertions(4);

        expect(plugin.meta.name).toBe(expectedMeta.name);
        expect(plugin.meta.namespace).toBe(expectedMeta.namespace);
        expect(plugin.meta.version).toBe(expectedMeta.version);
        expect(plugin.meta.name).not.toBe(
            "eslint-plugin-json-schema-validator"
        );
    });

    it("all rules should expose complete modern ESLint metadata.", () => {
        expect.assertions(1);

        expect(collectRuleMetadataProblems()).toStrictEqual({
            emptyDescriptionRules: [],
            emptyMessagesRules: [],
            emptyMessageTextRules: [],
            invalidDefaultOptionRules: [],
            invalidDocsRules: [],
            invalidFixableRules: [],
            invalidSuggestionRules: [],
            invalidTypeRules: [],
            missingDocsFiles: [],
            missingSchemaRules: [],
        });
    });

    it("recommended rule metadata should match recommended config wiring.", () => {
        expect.assertions(1);

        const configuredRecommendedRuleIds = plugin.configs.recommended
            .flatMap((config) => getRuleKeys(config.rules))
            .filter((ruleId) => ruleId.startsWith(`${expectedMeta.namespace}/`))
            .toSorted();
        const metadataRecommendedRuleIds = ruleEntries
            .filter(
                ([, ruleModule]) => ruleModule.meta.docs.recommended === true
            )
            .map(([ruleName]) => `${expectedMeta.namespace}/${ruleName}`)
            .toSorted();

        expect(configuredRecommendedRuleIds).toStrictEqual(
            metadataRecommendedRuleIds
        );
    });
});
