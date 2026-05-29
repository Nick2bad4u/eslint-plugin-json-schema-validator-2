import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "vitest";

import type { RuleModule } from "../../../src/types.ts";

import { rules as allRules } from "../../../src/utils/rules.ts";

/**
 * @returns {Array} Get the list of rules placed in the directory.
 */
async function getDirRules() {
  const rules: Record<string, RuleModule> = {};

  const rulesRoot = path.resolve(
    import.meta.dirname,
    "../../../src/rules",
  );
  for (const filename of fs
    .readdirSync(rulesRoot)
    .filter((n) => n.endsWith(".ts"))) {
    const ruleName = filename.replace(/\.ts$/v, "");
    const ruleId = `json-schema-validator/${ruleName}`;

    const rule = (
      await import(pathToFileURL(path.join(rulesRoot, filename)).href)
    ).default;
    rules[ruleId] = rule;
  }

  return rules;
}

const dirRules = await getDirRules();

describe("check that all the rules have the correct names.", () => {
  for (const ruleId of Object.keys(dirRules)) {
    it(ruleId, () => {
      const rule = dirRules[ruleId];
      assert.ok(rule, `Missing rule: ${ruleId}`);
      assert.strictEqual(rule.meta.docs.ruleId, ruleId);
    });
  }
});

describe("check if the strict of all rules is correct", () => {
  it("rule count equals", () => {
    assert.ok(
      allRules.length === Object.keys(dirRules).length,
      `Did not equal the number of rules. expect:${
        Object.keys(dirRules).length
      } actual:${allRules.length}`,
    );
  });

  for (const rule of allRules) {
    it(rule.meta.docs.ruleId, () => {
      assert.ok(Boolean(rule.meta.docs.ruleId), "Did not set `ruleId`");
      assert.ok(Boolean(rule.meta.docs.ruleName), "Did not set `ruleName`");
      assert.ok(Boolean(dirRules[rule.meta.docs.ruleId]), "Did not exist rule");
    });

    if (Object.keys(rule.meta.messages).length > 0) {
      describe("check if the messages are correct", () => {
        describe(rule.meta.docs.ruleId, () => {
          for (const messageId of Object.keys(rule.meta.messages)) {
          it(messageId, () => {
            const message = rule.meta.messages[messageId];
            assert.ok(message, `Missing message: ${messageId}`);
            assert.ok(
              message.endsWith(".") || message.endsWith("}}"),
              "Doesn't end with a dot.",
            );
          });
          }
        });
      });
    }
  }
});
