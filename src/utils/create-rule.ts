import type { Rule } from "eslint";
import type { UnknownRecord } from "type-fest";
import type { AST as VueAST } from "vue-eslint-parser";

import * as jsoncESLintParser from "jsonc-eslint-parser";
import * as path from "node:path";
import * as tomlESLintParser from "toml-eslint-parser";
import {
    arrayIncludes,
    isPresent,
    keyIn,
    objectEntries,
    safeCastTo,
} from "ts-extras";
import * as yamlESLintParser from "yaml-eslint-parser";

import type {
    RuleContext,
    RuleDefinition,
    RuleListener,
    RuleModule,
    SourceCode,
} from "../types.js";

interface CustomBlockVisitorOptions {
    create: (blockContext: RuleContext) => RuleListener;
    target:
        | ((lang: null | string, block: VueAST.VElement) => boolean)
        | readonly string[];
}

type DefineCustomBlocksVisitor = (
    context: Rule.RuleContext,
    parser: unknown,
    options: CustomBlockVisitorOptions
) => RuleListener;

interface ParserServicesWithCustomBlocks {
    defineCustomBlocksVisitor: DefineCustomBlocksVisitor;
}

const IGNORED_CUSTOM_BLOCK_ATTRIBUTES = [
    "id",
    "index",
    "src",
    "type",
] as const;

/**
 * Define the rule.
 *
 * @param ruleName - RuleName
 * @param rule - Rule module
 *
 * @throws If the rule metadata does not match the registered rule name.
 */
export function createRule(ruleName: string, rule: RuleDefinition): RuleModule {
    const expectedRuleId = `json-schema-validator-2/${ruleName}`;
    if (
        rule.meta.docs.ruleName !== ruleName ||
        rule.meta.docs.ruleId !== expectedRuleId
    ) {
        throw new Error(
            `Rule metadata mismatch for ${ruleName}: expected docs.ruleName "${ruleName}" and docs.ruleId "${expectedRuleId}".`
        );
    }

    return {
        create(context: Rule.RuleContext): RuleListener {
            const sourceCode = context.sourceCode;
            const filename = context.filename;
            const ruleContext = toRuleContext(context);
            const visitor = rule.create(ruleContext, {
                customBlock: false,
                filename,
            });
            const defineCustomBlocksVisitor =
                getDefineCustomBlocksVisitor(sourceCode);
            if (
                isPresent(defineCustomBlocksVisitor) &&
                path.extname(filename) === ".vue"
            ) {
                const jsonVisitor = defineCustomBlocksVisitor(
                    context,
                    jsoncESLintParser,
                    {
                        create: (blockContext) =>
                            createCustomBlockRule(rule, blockContext, "json"),
                        target: (lang, block) => {
                            if (isPresent(lang)) {
                                return /^json[5c]?$/v.test(lang);
                            }
                            return block.name === "i18n";
                        },
                    }
                );
                const yamlVisitor = defineCustomBlocksVisitor(
                    context,
                    yamlESLintParser,
                    {
                        create: (blockContext) =>
                            createCustomBlockRule(rule, blockContext, "yaml"),
                        target: ["yaml", "yml"],
                    }
                );
                const tomlVisitor = defineCustomBlocksVisitor(
                    context,
                    tomlESLintParser,
                    {
                        create: (blockContext) =>
                            createCustomBlockRule(rule, blockContext, "toml"),
                        target: ["toml"],
                    }
                );

                return compositingVisitors(
                    visitor,
                    jsonVisitor,
                    yamlVisitor,
                    tomlVisitor
                );
            }

            return visitor;
        },
        meta: rule.meta,
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
        for (const [key, nextVisitor] of objectEntries(v)) {
            const originalVisitor = visitor[key];
            visitor[key] =
                isPresent(originalVisitor) && isPresent(nextVisitor)
                    ? (...args) => {
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- ESLint visitor arguments are intentionally variadic and parser-specific.
                          originalVisitor(...args);
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- ESLint visitor arguments are intentionally variadic and parser-specific.
                          nextVisitor(...args);
                      }
                    : nextVisitor;
        }
    }

    return visitor;
}

/**
 * Composes a rule visitor for a Vue custom block.
 */
function createCustomBlockRule(
    rule: RuleDefinition,
    blockContext: RuleContext,
    langFallback: string
): RuleListener {
    const customBlock = blockContext.sourceCode.parserServices.customBlock;
    if (!isPresent(customBlock)) {
        return {};
    }

    return rule.create(blockContext, {
        customBlock: true,
        filename: getBlockFileName(
            blockContext.filename,
            customBlock,
            langFallback
        ),
    });
}

/**
 * Gets file name of a Vue custom block.
 */
function getBlockFileName(
    filename: string,
    customBlock: VueAST.VElement,
    langFallback: string
): string {
    const attrs: Record<string, null | string> = {};
    for (const attr of customBlock.startTag.attributes) {
        if (!attr.directive) {
            attrs[attr.key.name] = attr.value?.value ?? null;
        }
    }
    const ext = attrs["lang"] ?? langFallback;

    let attrQuery = "";
    for (const [key, val] of objectEntries(attrs)) {
        if (!arrayIncludes(IGNORED_CUSTOM_BLOCK_ATTRIBUTES, key)) {
            attrQuery += `&${key}=${val ?? ""}`;
        }
    }

    const result = `${customBlock.name}.${ext}`;
    return `${filename}/${result}?vue&type=custom&blockType=${customBlock.name}${attrQuery}`;
}

/**
 * Extracts Vue parser custom-block visitor support when available.
 */
function getDefineCustomBlocksVisitor(
    sourceCode: Rule.RuleContext["sourceCode"]
): DefineCustomBlocksVisitor | null {
    const parserServices: unknown = sourceCode.parserServices;
    if (hasCustomBlockParserServices(parserServices)) {
        return parserServices.defineCustomBlocksVisitor;
    }

    return null;
}

/**
 * Checks whether parser services support Vue custom blocks.
 */
function hasCustomBlockParserServices(
    parserServices: unknown
): parserServices is ParserServicesWithCustomBlocks {
    return (
        isUnknownRecord(parserServices) &&
        keyIn(parserServices, "defineCustomBlocksVisitor") &&
        typeof parserServices["defineCustomBlocksVisitor"] === "function"
    );
}

/**
 * Checks whether a value is an object record.
 */
function isUnknownRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null;
}

/**
 * Converts ESLint's public rule context to this plugin's compatibility context.
 */
function toRuleContext(context: Rule.RuleContext): RuleContext {
    return {
        cwd: context.cwd,
        filename: context.filename,
        id: context.id,
        options: context.options,
        physicalFilename: context.physicalFilename,
        report: (descriptor) => {
            context.report(descriptor);
        },
        settings: safeCastTo<RuleContext["settings"]>(context.settings),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ESLint's generic SourceCode type is narrower than parser-specific JSON/YAML/TOML SourceCode at this compatibility boundary.
        sourceCode: context.sourceCode as unknown as SourceCode,
    };
}
