import type { Rule } from "eslint";
import type { AST as VueAST } from "vue-eslint-parser";

import * as jsoncESLintParser from "jsonc-eslint-parser";
import path from "node:path";
import * as tomlESLintParser from "toml-eslint-parser";
import * as yamlESLintParser from "yaml-eslint-parser";

/* eslint @typescript-eslint/no-explicit-any: off -- util */
import type {
  PartialRuleModule,
  RuleContext,
  RuleListener,
  RuleModule,
} from "../types.ts";

/**
 * Define the rule.
 * @param ruleName ruleName
 * @param rule rule module
 */
export function createRule(
  ruleName: string,
  rule: PartialRuleModule,
): RuleModule {
  return {
    create(context: Rule.RuleContext): any {
      const sourceCode = context.sourceCode;
      const filename = context.filename;
      const visitor = rule.create(context as any, {
        customBlock: false,
        filename,
      });
      if (
        typeof sourceCode.parserServices.defineCustomBlocksVisitor ===
          "function" &&
        path.extname(filename) === ".vue"
      ) {
        const jsonVisitor = sourceCode.parserServices.defineCustomBlocksVisitor(
          context,
          jsoncESLintParser,
          {
            create(blockContext: RuleContext) {
              return rule.create(blockContext, {
                customBlock: true,
                filename: getBlockFileName(
                  blockContext.parserServices.customBlock!,
                  "json",
                ),
              });
            },
            target(lang: null | string, block: VueAST.VElement) {
              if (lang) {
                return /^json[5c]?$/i.test(lang);
              }
              return block.name === "i18n";
            },
          },
        );
        const yamlVisitor = sourceCode.parserServices.defineCustomBlocksVisitor(
          context,
          yamlESLintParser,
          {
            create(blockContext: RuleContext) {
              return rule.create(blockContext, {
                customBlock: true,
                filename: getBlockFileName(
                  blockContext.parserServices.customBlock!,
                  "yaml",
                ),
              });
            },
            target: ["yaml", "yml"],
          },
        );
        const tomlVisitor = sourceCode.parserServices.defineCustomBlocksVisitor(
          context,
          tomlESLintParser,
          {
            create(blockContext: RuleContext) {
              return rule.create(blockContext, {
                customBlock: true,
                filename: getBlockFileName(
                  blockContext.parserServices.customBlock!,
                  "toml",
                ),
              });
            },
            target: ["toml"],
          },
        );

        return compositingVisitors(
          visitor,
          jsonVisitor,
          yamlVisitor,
          tomlVisitor,
        );
      }

      /** Get file name of block */
      function getBlockFileName(
        customBlock: VueAST.VElement,
        langFallback: string,
      ): string {
        const attrs: Record<string, null | string> = {};
        for (const attr of customBlock.startTag.attributes) {
          if (!attr.directive) {
            attrs[attr.key.name] = attr.value?.value ?? null;
          }
        }
        const ext = attrs["lang"] || langFallback;

        let attrQuery = "";
        for (const [key, val] of Object.entries(attrs)) {
          if (["id", "index", "src", "type"].includes(key)) {
            continue;
          }
          attrQuery += `&${key}=${val}`;
        }

        const result = `${customBlock.name}.${ext}`;
        return `${filename}/${result}?vue&type=custom&blockType=${customBlock.name}${attrQuery}`;
      }
      return visitor;

    },
    meta: {
      ...rule.meta,
      docs: {
        ...rule.meta.docs,
        ruleId: `json-schema-validator-2/${ruleName}`,
        ruleName,
        url: `https://nick2bad4u.github.io/eslint-plugin-json-schema-validator-2/docs/rules/${ruleName}`,
      },
    },
  };
}

/**
 * Compositing visitors
 */
function compositingVisitors(
  visitor: RuleListener,
  ...visitors: RuleListener[]
): RuleListener {
  for (const v of visitors) {
    for (const key in v) {
      if (visitor[key]) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- false positive?
        const o = visitor[key]!;
        visitor[key] = (...args) => {
          o(...args);
          v[key]!(...args);
        };
      } else {
        visitor[key] = v[key];
      }
    }
  }
  return visitor;
}
