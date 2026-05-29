import type { AST } from "vue-eslint-parser";

import { Linter, type Rule } from "eslint";
import * as espree from "espree";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { RuleContext, SourceCode } from "../../../../src/types";

import {
    type AnalyzedJsAST,
    analyzeJsAST,
    type PathData,
} from "../../../../src/utils/ast/js/analyze";

const FIXTURES_ROOT = path.join(
    // eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../fixtures/utils/ast/js"
);

interface AnalyzedOutput {
    object: unknown;
    paths: OutputPathData;
}

interface OutputPathData {
    children: Record<string, OutputPathData>;
    key: null | string;
}

const fixtureFilenames = [...listupInput(FIXTURES_ROOT)];

describe("ast for JS.", () => {
    it.each(fixtureFilenames)("%s", (filename: string) => {
        expect.assertions(1);

        const input = fs
            .readFileSync(filename, "utf8")
            .replaceAll("\r\n", "\n");
        const outputFile = filename.replace(/input\.js$/v, "output.json");

        const linter = new Linter();
        let result: AnalyzedOutput | undefined;
        const err = linter.verify(input, {
            languageOptions: {
                ecmaVersion: 2020,
                parser: espree,
                sourceType: "module",
            },
            plugins: {
                test: {
                    rules: {
                        test: createAnalysisRule((output) => {
                            result = output;
                        }),
                    },
                },
            },
            rules: { "test/test": "error" },
        });
        throwOnFirstLintError(err);

        const analyzedResult = requireAnalyzedOutput(result, filename);
        ensureOutputFixture(outputFile, analyzedResult);

        const output = JSON.parse(
            fs.readFileSync(outputFile, "utf8").replaceAll("\r\n", "\n")
        ) as unknown;

        expect(analyzedResult).toStrictEqual(output);
    });

    it("throws when a fixture does not produce analysis output.", () => {
        expect.assertions(1);

        expect(() =>
            requireAnalyzedOutput(undefined, "missing-input.js")
        ).toThrow("No analysis result was produced for missing-input.js.");
    });
});

function createAnalysisRule(
    onResult: (output: AnalyzedOutput) => void
): Rule.RuleModule {
    const ruleModule = {
        create(context: Rule.RuleContext) {
            return {
                ExportDefaultDeclaration(
                    node: AST.ESLintExportDefaultDeclaration
                ) {
                    const declarationRange = node.declaration.range;
                    const analyzedAst = analyzeJsAST(
                        node.declaration as never,
                        declarationRange,
                        context as unknown as RuleContext
                    );
                    if (analyzedAst === null) {
                        return;
                    }

                    onResult(
                        toOutput(
                            analyzedAst,
                            context.sourceCode as unknown as SourceCode
                        )
                    );
                },
            };
        },
    };

    return ruleModule as unknown as Rule.RuleModule;
}

function ensureOutputFixture(outputFile: string, result: AnalyzedOutput): void {
    if (!fs.existsSync(outputFile)) {
        fs.writeFileSync(
            outputFile,
            `${JSON.stringify(result, null, 4)}\n`,
            "utf8"
        );
    }
}

function* listupInput(rootDir: string): IterableIterator<string> {
    for (const filename of fs.readdirSync(rootDir)) {
        if (!filename.startsWith("_")) {
            const abs = path.join(rootDir, filename);
            if (filename.endsWith("input.js")) {
                yield abs;
            } else if (fs.statSync(abs).isDirectory()) {
                yield* listupInput(abs);
            }
        }
    }
}

function requireAnalyzedOutput(
    result: AnalyzedOutput | undefined,
    filename: string
): AnalyzedOutput {
    if (result === undefined) {
        throw new Error(`No analysis result was produced for ${filename}.`);
    }

    return result;
}

function throwOnFirstLintError(messages: readonly Linter.LintMessage[]): void {
    const firstError = messages[0];
    if (firstError !== undefined) {
        throw new Error(firstError.message);
    }
}

function toOutput(
    result: AnalyzedJsAST,
    sourceCode: SourceCode
): AnalyzedOutput {
    const text = sourceCode.text;
    const serializedObject = JSON.stringify(
        result.object,
        (_key: string, value: unknown): unknown =>
            typeof value === "symbol" ? "$UNKNOWN$" : value
    );

    if (serializedObject === undefined) {
        throw new TypeError(
            "Expected analyzed object to be JSON serializable."
        );
    }

    return {
        object: JSON.parse(serializedObject) as unknown,
        paths: normalizePathData(result.pathData),
    };

    function normalizePathData(pathData: PathData): OutputPathData {
        const key =
            typeof pathData.key === "function"
                ? pathData.key(sourceCode)
                : pathData.key;
        const children: Record<string, OutputPathData> = {};
        for (const [childKey, val] of pathData.children.entries()) {
            if (val !== null && val !== undefined && typeof val !== "symbol") {
                children[childKey] = normalizePathData(val);
            }
        }
        return {
            children,
            key: key === null ? null : text.slice(...key),
        };
    }
}
