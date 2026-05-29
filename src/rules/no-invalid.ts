import type { AST as JSONAST } from "jsonc-eslint-parser";
import type { AST as TOML } from "toml-eslint-parser";
import type { AST } from "vue-eslint-parser";
import type { AST as YAML } from "yaml-eslint-parser";

import { toCompatCreate } from "eslint-json-compat-utils";
import { getStaticJSONValue } from "jsonc-eslint-parser";
import { minimatch } from "minimatch";
import fs from "node:fs";
import path from "node:path";
import { getStaticTOMLValue } from "toml-eslint-parser";
import { arrayFirst, safeCastTo } from "ts-extras";
import { getStaticYAMLValue } from "yaml-eslint-parser";

import type { RuleContext, RuleModule } from "../types.ts";
import type { NodeData } from "../utils/ast/common.ts";
import type { PathData } from "../utils/ast/index.ts";
import type { SchemaObject } from "../utils/types.ts";
import type { ValidateError, Validator } from "../utils/validator-factory.ts";

import {
    analyzeJsAST,
    getJSONNodeFromPath,
    getTOMLNodeFromPath,
    getYAMLNodeFromPath,
} from "../utils/ast/index.ts";
import { createRule } from "../utils/index.ts";
import { loadJson, loadSchema } from "../utils/schema.ts";
import { compile } from "../utils/validator-factory.ts";

const CATALOG_URL = "https://www.schemastore.org/api/json/catalog.json";

type SchemaKind = "$schema" | "catalog" | "options";

/**
 * Checks if match file
 */
function matchFile(filename: string, fileMatch: string[]) {
    return (
        fileMatch.includes(path.basename(filename)) ||
        fileMatch.some((fm) => minimatch(filename, fm, { dot: true }))
    );
}

/**
 * Report for cannot resolved schema object
 */
function reportCannotResolvedObject(context: RuleContext) {
    context.report({
        loc: { column: 0, line: 1 },
        message: "Specified schema could not be resolved.",
    });
}

/**
 * Report for cannot resolved schema path
 */
function reportCannotResolvedPath(schemaPath: string, context: RuleContext) {
    context.report({
        loc: { column: 0, line: 1 },
        message: `Specified schema could not be resolved. Path: "${schemaPath}"`,
    });
}

/**
 * Generate validator from schema object
 */
function schemaObjectToValidator(
    schema: null | SchemaObject,
    context: RuleContext
): null | Validator {
    if (!schema) {
        return null;
    }
    const schemaPath = context.cwd;
    return compile(schema, schemaPath, context);
}

/**
 * Generate validator from schema path
 */
function schemaPathToValidator(
    schemaPath: string,
    context: RuleContext
): null | Validator {
    const schema = loadSchema(schemaPath, context);
    if (!schema) {
        return null;
    }
    return compile(schema, schemaPath, context);
}
const SCHEMA_KINDS: SchemaKind[] = [
    "$schema",
    "options",
    "catalog",
];

/** Get mergeSchemas option */
function parseMergeSchemasOption(
    option: boolean | string[] | undefined
): null | SchemaKind[] {
    return option === true
        ? SCHEMA_KINDS
        : Array.isArray(option)
          ? [...(option as SchemaKind[])].sort(
                (a, b) => SCHEMA_KINDS.indexOf(a) - SCHEMA_KINDS.indexOf(b)
            )
          : null;
}

const noInvalidRule: RuleModule = createRule("no-invalid", {
    create: toCompatCreate((context, { filename }) => {
        const sourceCode = context.sourceCode;
        const cwd = context.cwd;
        const relativeFilename = filename.startsWith(cwd)
            ? path.relative(cwd, filename)
            : filename;

        const validator = createValidator(context, relativeFilename);
        if (!validator) {
            return {};
        }

        let existsExports = false;

        /**
         * Validate JSON Schema
         */
        function validateData(
            data: unknown,
            resolveLoc: (error: ValidateError) => JSONAST.SourceLocation | null
        ) {
            const errors = validator!(data);
            for (const error of errors) {
                const loc = resolveLoc(error);

                if (!loc) {
                    // Ignore
                    continue;
                }

                context.report({
                    loc,
                    message: error.message,
                });
            }
        }

        /**
         * Validate JS Object
         */
        function validateJSExport(
            node: AST.ESLintExpression,
            rootRange: [number, number]
        ) {
            if (existsExports) {
                return;
            }
            existsExports = true;

            const data = analyzeJsAST(node, rootRange, context);
            if (data == null) {
                return;
            }

            validateData(data.object, (error) => {
                let target: PathData | undefined = data.pathData;
                for (const p of error.path) {
                    const next = target?.children.get(p);
                    target = typeof next === "symbol" ? undefined : next;
                }
                const key = target?.key;
                const range = typeof key === "function" ? key(sourceCode) : key;
                if (!range) {
                    return null;
                }
                return {
                    end: sourceCode.getLocFromIndex(range[1]),
                    start: sourceCode.getLocFromIndex(arrayFirst(range)),
                };
            });
        }

        /** Find schema path from program */
        function findSchemaPathFromJSON(node: JSONAST.JSONProgram) {
            const rootExpr = arrayFirst(node.body).expression;
            if (rootExpr.type !== "JSONObjectExpression") {
                return null;
            }
            for (const prop of rootExpr.properties) {
                if (
                    prop.computed ||
                    (prop.key.type === "JSONIdentifier"
                        ? prop.key.name
                        : prop.key.value) !== "$schema"
                ) {
                    continue;
                }
                return getStaticJSONValue(prop.value);
            }
            return null;
        }

        /**
         * ErrorData to report location.
         */
        function errorDataToLoc(
            errorData: NodeData<
                JSONAST.JSONNode | TOML.TOMLNode | YAML.YAMLNode
            >
        ) {
            if (errorData.key) {
                const range = errorData.key(sourceCode);
                return {
                    end: sourceCode.getLocFromIndex(range[1]),
                    start: sourceCode.getLocFromIndex(arrayFirst(range)),
                };
            }
            return errorData.value.loc;
        }
        function findSchemaPathFromYAML(node: YAML.YAMLProgram) {
            const rootExpr = arrayFirst(node.body)?.content;
            if (rootExpr?.type !== "YAMLMapping") {
                return null;
            }
            for (const pair of rootExpr.pairs) {
                if (
                    !pair.key ||
                    !pair.value ||
                    pair.key.type !== "YAMLScalar" ||
                    pair.key.value !== "$schema"
                ) {
                    continue;
                }
                return getStaticYAMLValue(pair.value);
            }
            return null;
        }
        function findSchemaPathFromTOML(node: TOML.TOMLProgram) {
            const rootExpr = arrayFirst(node.body);
            for (const body of rootExpr.body) {
                if (
                    body.type !== "TOMLKeyValue" ||
                    body.key.keys.length !== 1
                ) {
                    continue;
                }
                const [key] = getStaticTOMLValue(body.key);
                if (key !== "$schema") {
                    continue;
                }
                return getStaticTOMLValue(body.value);
            }
            return null;
        }
        function findSchemaPath(node: unknown) {
            let $schema = null;
            if (sourceCode.parserServices.isJSON) {
                const program = node as JSONAST.JSONProgram;
                $schema = findSchemaPathFromJSON(program);
            } else if (sourceCode.parserServices.isYAML) {
                const program = node as YAML.YAMLProgram;
                $schema = findSchemaPathFromYAML(program);
            } else if (sourceCode.parserServices.isTOML) {
                const program = node as TOML.TOMLProgram;
                $schema = findSchemaPathFromTOML(program);
            }
            return typeof $schema === "string"
                ? $schema.startsWith(".")
                    ? path.resolve(
                          path.dirname(
                              typeof context.getPhysicalFilename === "function"
                                  ? context.getPhysicalFilename()
                                  : getPhysicalFilename(context.filename)
                          ),
                          $schema
                      )
                    : $schema
                : null;
        }
        function get$SchemaValidators(
            context: RuleContext
        ): null | Validator[] {
            const $schemaPath = findSchemaPath(sourceCode.ast);
            if (!$schemaPath) return null;

            const validator = schemaPathToValidator($schemaPath, context);
            if (!validator) {
                reportCannotResolvedPath($schemaPath, context);
                return null;
            }

            return [validator];
        }
        function getCatalogValidators(
            context: RuleContext,
            relativeFilename: string
        ): null | Validator[] {
            const option = arrayFirst(context.options) || {};
            const useSchemastoreCatalog =
                option.useSchemastoreCatalog !== false;
            if (!useSchemastoreCatalog) {
                return null;
            }

            interface ISchema {
                description?: string;
                fileMatch: string[];
                name?: string;
                url: string;
            }
            const catalog = loadJson<{ schemas: ISchema[] }>(
                CATALOG_URL,
                context
            );
            if (!catalog) {
                return null;
            }

            const validators: Validator[] = [];
            for (const schemaData of catalog.schemas) {
                if (!schemaData.fileMatch) {
                    continue;
                }
                // Exclude schemas with patterns that match all json files.
                // https://github.com/SchemaStore/schemastore/pull/3291
                if (schemaData.fileMatch.some((s) => /^\*\.json$/v.test(s))) {
                    continue;
                }
                if (!matchFile(relativeFilename, schemaData.fileMatch)) {
                    continue;
                }
                const validator = schemaPathToValidator(
                    schemaData.url,
                    context
                );
                if (validator) validators.push(validator);
            }
            return validators.length > 0 ? validators : null;
        }
        function getOptionsValidators(
            context: RuleContext,
            filename: string
        ): null | Validator[] {
            const option = arrayFirst(context.options);
            if (typeof option === "string") {
                const validator = schemaPathToValidator(option, context);
                return validator ? [validator] : null;
            }

            if (typeof option !== "object" || !Array.isArray(option.schemas)) {
                return null;
            }

            const validators: Validator[] = [];
            for (const schemaData of option.schemas) {
                if (!matchFile(filename, schemaData.fileMatch)) {
                    continue;
                }

                if (typeof schemaData.schema === "string") {
                    const validator = schemaPathToValidator(
                        schemaData.schema,
                        context
                    );
                    if (validator) {
                        validators.push(validator);
                    } else {
                        reportCannotResolvedPath(schemaData.schema, context);
                    }
                } else {
                    const validator = schemaObjectToValidator(
                        schemaData.schema,
                        context
                    );
                    if (validator) {
                        validators.push(validator);
                    } else {
                        reportCannotResolvedObject(context);
                    }
                }
            }
            return validators.length > 0 ? validators : null;
        }
        function createValidator(context: RuleContext, filename: string) {
            const mergeSchemas = parseMergeSchemasOption(
                arrayFirst(context.options)?.mergeSchemas
            );

            const validatorsCtx = createValidatorsContext(context, filename);
            if (
                mergeSchemas &&
                mergeSchemas.some((kind) => validatorsCtx[kind])
            ) {
                const validators: Validator[] = [];
                for (const kind of mergeSchemas) {
                    const v = validatorsCtx[kind];
                    if (v) validators.push(...v);
                }
                return margeValidators(validators);
            }

            const validators =
                validatorsCtx.$schema ||
                validatorsCtx.options ||
                validatorsCtx.catalog;
            if (!validators) {
                return null;
            }
            /** Marge validators */
            function margeValidators(validators: Validator[]) {
                return (data: unknown) =>
                    validators.reduce<ValidateError[]>(
                        (errors, validator) => [...errors, ...validator(data)],
                        []
                    );
            }
            return margeValidators(validators);
        }
        function createValidatorsContext(
            context: RuleContext,
            filename: string
        ) {
            interface Cache {
                validators: null | Validator[];
            }
            let $schema: Cache | null = null;
            let options: Cache | null = null;
            let catalog: Cache | null = null;

            /**
             * Get a validator. Returns the value of the cache if there is one.
             * If there is no cache, cache and return the value obtained from
             * the supplier function
             */
            function get(
                cache: Cache | null,
                setCache: (c: Cache) => void,
                supplier: () => null | Validator[]
            ) {
                if (cache) {
                    return cache.validators;
                }
                const v = supplier();
                setCache({ validators: v });
                return v;
            }

            return {
                get $schema() {
                    return get(
                        $schema,
                        (c) => ($schema = c),
                        () => get$SchemaValidators(context)
                    );
                },
                get catalog() {
                    return get(
                        catalog,
                        (c) => (catalog = c),
                        () => getCatalogValidators(context, filename)
                    );
                },
                get options() {
                    return get(
                        options,
                        (c) => (options = c),
                        () => getOptionsValidators(context, filename)
                    );
                },
            };
        }
        return {
            AssignmentExpression(node: AST.ESLintAssignmentExpression) {
                if (
                    // exports = {}
                    (node.left.type === "Identifier" &&
                        node.left.name === "exports") ||
                    // Module.exports = {}
                    (node.left.type === "MemberExpression" &&
                        node.left.object.type === "Identifier" &&
                        node.left.object.name === "module" &&
                        !node.left.computed &&
                        node.left.property.type === "Identifier" &&
                        node.left.property.name === "exports")
                ) {
                    validateJSExport(node.right, node.left.range);
                }
            },
            ExportDefaultDeclaration(node: AST.ESLintExportDefaultDeclaration) {
                if (
                    node.declaration.type === "FunctionDeclaration" ||
                    node.declaration.type === "ClassDeclaration" ||
                    node.declaration.type === "VariableDeclaration"
                ) {
                    return;
                }
                const defaultToken = sourceCode.getTokenBefore(
                    node.declaration
                )!;
                validateJSExport(node.declaration, [
                    arrayFirst(node.range),
                    defaultToken.range![1],
                ]);
            },
            Program(node) {
                if (sourceCode.parserServices.isJSON) {
                    const program = safeCastTo<JSONAST.JSONProgram>(node);
                    validateData(getStaticJSONValue(program), (error) =>
                        errorDataToLoc(getJSONNodeFromPath(program, error.path))
                    );
                } else if (sourceCode.parserServices.isYAML) {
                    const program = safeCastTo<YAML.YAMLProgram>(node);
                    validateData(getStaticYAMLValue(program), (error) =>
                        errorDataToLoc(getYAMLNodeFromPath(program, error.path))
                    );
                } else if (sourceCode.parserServices.isTOML) {
                    const program = safeCastTo<TOML.TOMLProgram>(node);
                    validateData(getStaticTOMLValue(program), (error) =>
                        errorDataToLoc(getTOMLNodeFromPath(program, error.path))
                    );
                }
            },
        };
    }),
    meta: {
        docs: {
            categories: ["recommended"],
            default: "warn",
            description: "validate object with JSON Schema.",
        },
        messages: {},
        schema: [
            {
                oneOf: [
                    { type: "string" },
                    {
                        additionalProperties: false,
                        properties: {
                            mergeSchemas: {
                                oneOf: [
                                    { type: "boolean" },
                                    {
                                        items: {
                                            enum: [
                                                "$schema",
                                                "catalog",
                                                "options",
                                            ],
                                            type: "string",
                                        },
                                        minItems: 2,
                                        type: "array",
                                        uniqueItems: true,
                                    },
                                ],
                            },
                            schemas: {
                                items: {
                                    additionalProperties: true, // It also accepts unrelated properties.
                                    properties: {
                                        description: { type: "string" },
                                        fileMatch: {
                                            items: { type: "string" },
                                            minItems: 1,
                                            type: "array",
                                        },
                                        name: { type: "string" },
                                        schema: { type: ["object", "string"] },
                                    },
                                    required: ["fileMatch", "schema"],
                                    type: "object",
                                },
                                type: "array",
                            },
                            useSchemastoreCatalog: { type: "boolean" },
                        },
                        type: "object",
                    },
                ],
            },
        ],
        type: "suggestion",
    },
});

export default noInvalidRule;

/**
 * ! copied from
 * https://github.com/mdx-js/eslint-mdx/blob/b97db2e912a416d5d40ddb78ab6c9fa1ab150c17/packages/eslint-mdx/src/helpers.ts#L28-L50
 *
 * Given a filepath, get the nearest path that is a regular file. The filepath
 * provided by eslint may be a virtual filepath rather than a file on disk. This
 * attempts to transform a virtual path into an on-disk path
 */
function getPhysicalFilename(filename: string, child?: string): string {
    try {
        if (fs.statSync(filename).isDirectory()) {
            return child || filename;
        }
    } catch (error) {
        const { code } = error as { code: string };
        // https://github.com/eslint/eslint/issues/11989
        // Additionally, it seems there is no `ENOTDIR` code on Windows...
        if (code === "ENOTDIR" || code === "ENOENT") {
            return getPhysicalFilename(path.dirname(filename), filename);
        }
    }
    return filename;
}
