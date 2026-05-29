import type { AST } from "vue-eslint-parser";

import { Linter } from "eslint";
import * as espree from "espree";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";

import type { SourceCode } from "../../../../src/types.ts";
import type {
    AnalyzedJsAST,
    PathData,
} from "../../../../src/utils/ast/js/index.ts";

import { analyzeJsAST } from "../../../../src/utils/ast/js/index.ts";

const FIXTURES_ROOT = path.join(
    import.meta.dirname,
    "../../../fixtures/utils/ast/js"
);

describe("aST for JS.", () => {
    for (const filename of listupInput(FIXTURES_ROOT)) {
        it(filename.slice(FIXTURES_ROOT.length), () => {
            const input = fs
                .readFileSync(filename, "utf8")
                .replaceAll("\r\n", "\n");
            const outputFile = filename.replace(/input.js$/, "output.json");

            const linter = new Linter();
            let result: any;
            const err = linter.verify(input, {
                languageOptions: {
                    ecmaVersion: 2020,
                    parser: espree,
                    sourceType: "module",
                },
                plugins: {
                    test: {
                        rules: {
                            test: {
                                // @ts-expect-error -- ignore
                                create(context) {
                                    return {
                                        ExportDefaultDeclaration(
                                            node: AST.ESLintExportDefaultDeclaration
                                        ) {
                                            result = toOutput(
                                                analyzeJsAST(
                                                    node.declaration as never,
                                                    node.declaration.range,
                                                    context as never
                                                )!,
                                                context.sourceCode as never
                                            );
                                        },
                                    };
                                },
                            },
                        },
                    },
                },
                rules: { "test/test": "error" },
            } as any);
            const firstError = err[0];
            if (firstError) {
                throw new Error(firstError.message);
            }

            if (!fs.existsSync(outputFile)) {
                fs.writeFileSync(
                    outputFile,
                    `${JSON.stringify(result, null, 4)}\n`,
                    "utf8"
                );
            }

            const output = JSON.parse(
                fs.readFileSync(outputFile, "utf8").replaceAll("\r\n", "\n")
            );

            assert.deepStrictEqual(result, output);
        });
    }
});

function* listupInput(rootDir: string): IterableIterator<string> {
    for (const filename of fs.readdirSync(rootDir)) {
        if (filename.startsWith("_")) {
            // Ignore
            continue;
        }
        const abs = path.join(rootDir, filename);
        if (filename.endsWith("input.js")) {
            yield abs;
        } else if (fs.statSync(abs).isDirectory()) {
            yield* listupInput(abs);
        }
    }
}

function toOutput(result: AnalyzedJsAST, sourceCode: SourceCode) {
    const text = sourceCode.text;
    return {
        object: JSON.parse(
            JSON.stringify(result.object, (_k, v) =>
                typeof v === "symbol" ? "$UNKNOWN$" : v
            )
        ),
        paths: normalizePathData(result.pathData),
    };

    function normalizePathData(pathData: PathData) {
        const key =
            typeof pathData.key === "function"
                ? pathData.key(sourceCode)
                : pathData.key;
        const children: Record<string, any> = {};
        for (const [key, val] of pathData.children.entries()) {
            if (val == null || typeof val === "symbol") {
                continue;
            }
            children[key] = normalizePathData(val);
        }
        return {
            children,
            key: key ? text.slice(...key) : key,
        };
    }
}
