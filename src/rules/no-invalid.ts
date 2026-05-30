import type { UnknownRecord } from "type-fest";
import type { AST } from "vue-eslint-parser";

/* eslint-disable import-x/max-dependencies -- This rule integrates four parser ASTs and split internal helpers after barrel removal. */
import { toCompatCreate } from "eslint-json-compat-utils";
import { getStaticJSONValue, type AST as JSONAST } from "jsonc-eslint-parser";
import { minimatch } from "minimatch";
import * as fs from "node:fs";
import * as path from "node:path";
import { getStaticTOMLValue, type AST as TOML } from "toml-eslint-parser";
import {
    arrayFirst,
    arrayIncludes,
    isDefined,
    isPresent,
    keyIn,
} from "ts-extras";
import { getStaticYAMLValue, type AST as YAML } from "yaml-eslint-parser";

import type { RuleContext, RuleModule, SourceCode } from "../types.js";
import type { NodeData } from "../utils/ast/common.js";
import type { SchemaObject } from "../utils/types.js";

import { analyzeJsAST, type PathData } from "../utils/ast/js/analyze.js";
import { getJSONNodeFromPath } from "../utils/ast/json.js";
import { getTOMLNodeFromPath } from "../utils/ast/toml.js";
import { getYAMLNodeFromPath } from "../utils/ast/yaml.js";
import { createRule } from "../utils/create-rule.js";
import { loadJson, loadSchema } from "../utils/schema.js";
import {
    compile,
    type ValidateError,
    type Validator,
} from "../utils/validator-factory.js";
/* eslint-enable import-x/max-dependencies -- Re-enable dependency counting after parser integration imports. */

const CATALOG_URL = "https://www.schemastore.org/api/json/catalog.json";
const YAML_SCHEMA_COMMENT_PATTERN =
    /^\s*yaml-language-server:\s*\$schema=(?<schema>\S+)\s*$/v;
/* eslint-disable perfectionist/sort-arrays -- Order encodes schema merge precedence. */
const SCHEMA_KINDS = [
    "$schema",
    "options",
    "catalog",
] as const satisfies readonly SchemaKind[];
/* eslint-enable perfectionist/sort-arrays -- Re-enable array sorting after precedence tuple. */

interface Cache {
    validators: null | Validator[];
}

interface OptionSchema {
    fileMatch: string[];
    schema: SchemaObject | string;
}

type ReportMode = "all" | "most-specific";

interface RuleObjectOption {
    mergeSchemas?: boolean | SchemaKind[];
    reportMode?: ReportMode;
    schemas?: OptionSchema[];
    useSchemastoreCatalog?: boolean;
}

type RuleOption = RuleObjectOption | string;

type SchemaKind = "$schema" | "catalog" | "options";

interface SchemaStoreCatalog {
    schemas: unknown[];
}

interface SchemaStoreSchema {
    fileMatch: string[];
    url: string;
}

interface ValidatorsContext {
    readonly $schema: null | Validator[];
    readonly catalog: null | Validator[];
    readonly options: null | Validator[];
}

/**
 * Rule definition for validating JSON-like files and JS exports with JSON
 * Schema.
 */
const noInvalidRule: RuleModule = createRule("no-invalid", {
    create: toCompatCreate((context, { filename }) => {
        const sourceCode = context.sourceCode;
        const cwd = context.cwd;
        const relativeFilename = filename.startsWith(cwd)
            ? path.relative(cwd, filename)
            : filename;

        const validator = createValidator(context, relativeFilename);
        if (!isPresent(validator)) {
            return {};
        }
        const activeValidator = validator;
        const reportMode = parseReportModeOption(
            getRuleObjectOption(context)?.reportMode
        );

        let existsExports = false;

        /**
         * Validate JSON Schema
         */
        function validateData(
            data: unknown,
            resolveLoc: (error: ValidateError) => JSONAST.SourceLocation | null
        ) {
            const errors = filterValidationErrors(
                activeValidator(data),
                reportMode
            );
            for (const error of errors) {
                const loc = resolveLoc(error);

                if (isPresent(loc)) {
                    context.report({
                        data: {
                            message: error.message,
                        },
                        loc,
                        messageId: "validationError",
                    });
                }
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
            if (!isPresent(data)) {
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
                if (!isPresent(range)) {
                    return null;
                }
                return rangeToLocation(sourceCode, range);
            });
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
                );
                const defaultTokenRangeEnd = defaultToken?.range?.[1];
                if (!isPresent(defaultTokenRangeEnd)) {
                    return;
                }

                validateJSExport(node.declaration, [
                    arrayFirst(node.range),
                    defaultTokenRangeEnd,
                ]);
            },
            Program(node: unknown) {
                if (isJSONProgram(sourceCode, node)) {
                    validateData(getStaticJSONValue(node), (error) =>
                        errorDataToLoc(
                            sourceCode,
                            getJSONNodeFromPath(node, error.path)
                        )
                    );
                } else if (isYAMLProgram(sourceCode, node)) {
                    validateData(getStaticYAMLValue(node), (error) =>
                        errorDataToLoc(
                            sourceCode,
                            getYAMLNodeFromPath(node, error.path)
                        )
                    );
                } else if (isTOMLProgram(sourceCode, node)) {
                    validateData(getStaticTOMLValue(node), (error) =>
                        errorDataToLoc(
                            sourceCode,
                            getTOMLNodeFromPath(node, error.path)
                        )
                    );
                }
            },
        };
    }),
    meta: {
        defaultOptions: [{}],
        docs: {
            categories: ["recommended"],
            default: "warn",
            description: "validate object with JSON Schema.",
            dialects: [
                "JavaScript",
                "JSON",
                "JSON5",
                "JSONC",
                "TOML",
                "Vue",
                "YAML",
            ],
            frozen: false,
            recommended: true,
            ruleId: "json-schema-validator-2/no-invalid",
            ruleName: "no-invalid",
            url: "https://nick2bad4u.github.io/eslint-plugin-json-schema-validator-2/docs/rules/no-invalid",
        },
        messages: {
            cannotResolveSchema: "Specified schema could not be resolved.",
            cannotResolveSchemaPath:
                'Specified schema could not be resolved. Path: "{{schemaPath}}".',
            validationError: "{{message}}",
        },
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
                            reportMode: {
                                enum: ["all", "most-specific"],
                                type: "string",
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
        type: "problem",
    },
});

export default noInvalidRule;

/**
 * Create the active validator for the current file.
 */
function createValidator(
    context: RuleContext,
    filename: string
): null | Validator {
    const mergeSchemas = parseMergeSchemasOption(
        getRuleObjectOption(context)?.mergeSchemas
    );

    const validatorsContext = createValidatorsContext(context, filename);
    if (
        isPresent(mergeSchemas) &&
        mergeSchemas.some((kind) => isPresent(validatorsContext[kind]))
    ) {
        const validators: Validator[] = [];
        for (const kind of mergeSchemas) {
            const schemaValidators = validatorsContext[kind];
            if (isPresent(schemaValidators)) {
                validators.push(...schemaValidators);
            }
        }
        return mergeValidators(validators);
    }

    const validators =
        validatorsContext.$schema ??
        validatorsContext.options ??
        validatorsContext.catalog;
    if (!isPresent(validators)) {
        return null;
    }
    return mergeValidators(validators);
}

/**
 * Create lazy validator context.
 */
function createValidatorsContext(
    context: RuleContext,
    filename: string
): ValidatorsContext {
    let schemaCache: Cache | null = null;
    let optionsCache: Cache | null = null;
    let catalogCache: Cache | null = null;

    return {
        get $schema() {
            return getCachedValidators(
                schemaCache,
                (cache) => {
                    schemaCache = cache;
                },
                () => getSchemaValidators(context)
            );
        },
        get catalog() {
            return getCachedValidators(
                catalogCache,
                (cache) => {
                    catalogCache = cache;
                },
                () => getCatalogValidators(context, filename)
            );
        },
        get options() {
            return getCachedValidators(
                optionsCache,
                (cache) => {
                    optionsCache = cache;
                },
                () => getOptionsValidators(context, filename)
            );
        },
    };
}

/**
 * Convert ErrorData to a report location.
 */
function errorDataToLoc(
    sourceCode: SourceCode,
    errorData: NodeData<JSONAST.JSONNode | TOML.TOMLNode | YAML.YAMLNode>
): JSONAST.SourceLocation {
    if (isPresent(errorData.key)) {
        return rangeToLocation(sourceCode, errorData.key(sourceCode));
    }
    if (isPresent(errorData.value)) {
        return errorData.value.loc;
    }
    return {
        end: { column: 0, line: 1 },
        start: { column: 0, line: 1 },
    };
}

/**
 * Filter validation errors by the configured reporting mode.
 */
function filterValidationErrors(
    errors: readonly ValidateError[],
    reportMode: ReportMode
): ValidateError[] {
    if (reportMode === "all") {
        return [...errors];
    }
    return errors.filter(
        (error) =>
            !errors.some(
                (candidate) =>
                    candidate !== error &&
                    isAncestorPath(error.path, candidate.path)
            )
    );
}

/**
 * Find and normalize a document $schema path.
 */
function findSchemaPath(
    context: RuleContext,
    sourceCode: SourceCode,
    node: JSONAST.JSONProgram | TOML.TOMLProgram | YAML.YAMLProgram
): null | string {
    let schema: unknown = null;
    if (isJSONProgram(sourceCode, node)) {
        schema = findSchemaPathFromJSON(node);
    } else if (isYAMLProgram(sourceCode, node)) {
        schema = findSchemaPathFromYAML(node);
        if (typeof schema !== "string") {
            schema = findSchemaPathFromYAMLComments(sourceCode);
        }
    } else if (isTOMLProgram(sourceCode, node)) {
        schema = findSchemaPathFromTOML(node);
    }

    if (typeof schema !== "string") {
        return null;
    }

    if (!schema.startsWith(".")) {
        return schema;
    }

    const physicalFilename =
        typeof context.getPhysicalFilename === "function"
            ? context.getPhysicalFilename()
            : getPhysicalFilename(context.filename);

    return path.resolve(path.dirname(physicalFilename), schema);
}

/**
 * Find schema path from JSON program.
 */
function findSchemaPathFromJSON(node: JSONAST.JSONProgram): unknown {
    const rootExpr = arrayFirst(node.body).expression;
    if (rootExpr.type !== "JSONObjectExpression") {
        return null;
    }
    for (const prop of rootExpr.properties) {
        const propertyName =
            prop.key.type === "JSONIdentifier" ? prop.key.name : prop.key.value;
        if (propertyName === "$schema") {
            return getStaticJSONValue(prop.value);
        }
    }
    return null;
}

/**
 * Find schema path from TOML program.
 */
function findSchemaPathFromTOML(node: TOML.TOMLProgram): unknown {
    const rootExpr = arrayFirst(node.body);
    if (!isPresent(rootExpr)) {
        return null;
    }
    for (const body of rootExpr.body) {
        if (body.type === "TOMLKeyValue" && body.key.keys.length === 1) {
            const [key] = getStaticTOMLValue(body.key);
            if (key === "$schema") {
                return getStaticTOMLValue(body.value);
            }
        }
    }
    return null;
}

/**
 * Find schema path from YAML program.
 */
function findSchemaPathFromYAML(node: YAML.YAMLProgram): unknown {
    const rootExpr = arrayFirst(node.body)?.content;
    if (rootExpr?.type !== "YAMLMapping") {
        return null;
    }
    for (const pair of rootExpr.pairs) {
        if (
            isPresent(pair.key) &&
            isPresent(pair.value) &&
            pair.key.type === "YAMLScalar" &&
            pair.key.value === "$schema"
        ) {
            return getStaticYAMLValue(pair.value);
        }
    }
    return null;
}

/**
 * Find schema path from a YAML language-server directive comment.
 */
function findSchemaPathFromYAMLComments(sourceCode: SourceCode): null | string {
    for (const comment of sourceCode.getAllComments()) {
        const match = YAML_SCHEMA_COMMENT_PATTERN.exec(comment.value);
        const schema = match?.groups?.["schema"];
        if (isPresent(schema)) {
            return schema;
        }
    }
    return null;
}

/**
 * Get a cached validator list or cache a freshly supplied one.
 */
function getCachedValidators(
    cache: Cache | null,
    setCache: (cache: Cache) => void,
    supplier: () => null | Validator[]
): null | Validator[] {
    if (isPresent(cache)) {
        return cache.validators;
    }
    const validators = supplier();
    setCache({ validators });
    return validators;
}

/**
 * Get SchemaStore catalog validators.
 */
function getCatalogValidators(
    context: RuleContext,
    relativeFilename: string
): null | Validator[] {
    if (!hasDataParserServices(context.sourceCode)) {
        return null;
    }

    const option = getRuleObjectOption(context);
    if (option?.useSchemastoreCatalog === false) {
        return null;
    }

    const catalog = loadJson(CATALOG_URL, context);
    if (!isSchemaStoreCatalog(catalog)) {
        return null;
    }

    const validators: Validator[] = [];
    for (const schemaData of catalog.schemas) {
        if (isSchemaStoreSchema(schemaData)) {
            const fileMatch = schemaData.fileMatch;
            const matchesAllJson = fileMatch.some((entry) =>
                /^\*\.json$/v.test(entry)
            );
            // Exclude schemas with patterns that match all json files.
            // https://github.com/SchemaStore/schemastore/pull/3291
            if (!matchesAllJson && matchFile(relativeFilename, fileMatch)) {
                const schemaValidator = schemaPathToValidator(
                    schemaData.url,
                    context
                );
                if (isPresent(schemaValidator)) {
                    validators.push(schemaValidator);
                }
            }
        }
    }
    return validators.length > 0 ? validators : null;
}

/**
 * Get explicitly configured schema validators.
 */
function getOptionsValidators(
    context: RuleContext,
    filename: string
): null | Validator[] {
    const option = getRuleOption(context);
    if (typeof option === "string") {
        const schemaValidator = schemaPathToValidator(option, context);
        return isPresent(schemaValidator) ? [schemaValidator] : null;
    }

    if (!isPresent(option?.schemas)) {
        return null;
    }

    const validators: Validator[] = [];
    for (const schemaData of option.schemas) {
        if (matchFile(filename, schemaData.fileMatch)) {
            const validator = optionSchemaToValidator(schemaData, context);
            if (isPresent(validator)) {
                validators.push(validator);
            }
        }
    }
    return validators.length > 0 ? validators : null;
}

/**
 * ! copied from
 * https://github.com/mdx-js/eslint-mdx/blob/b97db2e912a416d5d40ddb78ab6c9fa1ab150c17/packages/eslint-mdx/src/helpers.ts#L28-L50
 *
 * Given a filepath, get the nearest path that is a regular file. The filepath
 * provided by eslint may be a virtual filepath rather than a file on disk. This
 * attempts to transform a virtual path into an on-disk path.
 */
function getPhysicalFilename(filename: string, child?: string): string {
    try {
        // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename -- ESLint rule setup is synchronous and only resolves ESLint-provided virtual filenames.
        if (fs.statSync(filename).isDirectory()) {
            return child ?? filename;
        }
    } catch (error) {
        // https://github.com/eslint/eslint/issues/11989
        // Additionally, it seems there is no `ENOTDIR` code on Windows.
        if (
            isErrorWithCode(error) &&
            (error.code === "ENOTDIR" || error.code === "ENOENT")
        ) {
            return getPhysicalFilename(path.dirname(filename), filename);
        }
    }
    return filename;
}

/**
 * Get the first configured rule option when it is an object.
 */
function getRuleObjectOption(context: RuleContext): null | RuleObjectOption {
    const option = getRuleOption(context);
    return typeof option === "string" ? null : option;
}

/**
 * Get the first configured rule option.
 */
function getRuleOption(context: RuleContext): null | RuleOption {
    const option = arrayFirst(context.options);
    if (typeof option === "string") {
        return option;
    }
    if (isRuleObjectOption(option)) {
        return option;
    }
    return null;
}

/**
 * Get $schema validators.
 */
function getSchemaValidators(context: RuleContext): null | Validator[] {
    const ast = context.sourceCode.ast;
    if (
        !isJSONProgram(context.sourceCode, ast) &&
        !isYAMLProgram(context.sourceCode, ast) &&
        !isTOMLProgram(context.sourceCode, ast)
    ) {
        return null;
    }

    const schemaPath = findSchemaPath(context, context.sourceCode, ast);
    if (!isPresent(schemaPath)) {
        return null;
    }

    const schemaValidator = schemaPathToValidator(schemaPath, context);
    if (!isPresent(schemaValidator)) {
        reportCannotResolvedPath(schemaPath, context);
        return null;
    }

    return [schemaValidator];
}

/**
 * Check whether parser services identify a data-parser program this rule can
 * validate directly.
 */
function hasDataParserServices(sourceCode: SourceCode): boolean {
    return (
        sourceCode.parserServices?.isJSON === true ||
        sourceCode.parserServices?.isTOML === true ||
        sourceCode.parserServices?.isYAML === true
    );
}

/**
 * Check whether one validation path is an ancestor of another.
 */
function isAncestorPath(
    ancestor: readonly string[],
    descendant: readonly string[]
): boolean {
    return (
        ancestor.length < descendant.length &&
        ancestor.every((segment, index) => descendant[index] === segment)
    );
}

/**
 * Check whether an unknown caught value has a Node.js error code.
 */
function isErrorWithCode(error: unknown): error is Error & { code: string } {
    return (
        error instanceof Error &&
        isRecord(error) &&
        keyIn(error, "code") &&
        typeof error["code"] === "string"
    );
}

/**
 * Check whether parser services describe a JSON program.
 */
function isJSONProgram(
    sourceCode: SourceCode,
    _node: unknown
): _node is JSONAST.JSONProgram {
    return (
        sourceCode.parserServices?.isJSON === true &&
        isRecord(_node) &&
        _node["type"] === "Program"
    );
}

/**
 * Check whether a value is a valid mergeSchemas option.
 */
function isMergeSchemasOption(value: unknown): value is boolean | SchemaKind[] {
    if (typeof value === "boolean") {
        return true;
    }
    if (!Array.isArray(value)) {
        return false;
    }
    for (const item of value) {
        if (!isSchemaKind(item)) {
            return false;
        }
    }
    return true;
}

/**
 * Check whether a value is an option schema.
 */
function isOptionSchema(value: unknown): value is OptionSchema {
    if (!isRecord(value)) {
        return false;
    }

    const { fileMatch, schema } = value;
    return (
        isStringArray(fileMatch) &&
        (typeof schema === "string" || isSchemaObject(schema))
    );
}

/**
 * Check whether a value is an array of option schemas.
 */
function isOptionSchemas(value: unknown): value is OptionSchema[] {
    return Array.isArray(value) && value.every(isOptionSchema);
}

/**
 * Check whether a value is an object record.
 */
function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check whether a value is a report mode.
 */
function isReportMode(value: unknown): value is ReportMode {
    return value === "all" || value === "most-specific";
}

/**
 * Check whether a value is a rule options object.
 */
function isRuleObjectOption(value: unknown): value is RuleObjectOption {
    if (!isRecord(value)) {
        return false;
    }

    const { mergeSchemas, reportMode, schemas, useSchemastoreCatalog } = value;
    return (
        (!isDefined(mergeSchemas) || isMergeSchemasOption(mergeSchemas)) &&
        (!isDefined(reportMode) || isReportMode(reportMode)) &&
        (!isDefined(schemas) || isOptionSchemas(schemas)) &&
        (!isDefined(useSchemastoreCatalog) ||
            typeof useSchemastoreCatalog === "boolean")
    );
}

/**
 * Check whether a value is a schema kind.
 */
function isSchemaKind(value: unknown): value is SchemaKind {
    return typeof value === "string" && arrayIncludes(SCHEMA_KINDS, value);
}

/**
 * Check whether a value is a JSON object schema.
 */
function isSchemaObject(value: unknown): value is SchemaObject {
    return isRecord(value);
}

/**
 * Check whether a parsed catalog has SchemaStore catalog shape.
 */
function isSchemaStoreCatalog(value: unknown): value is SchemaStoreCatalog {
    return isRecord(value) && Array.isArray(value["schemas"]);
}

/**
 * Check whether a parsed catalog schema has the fields this rule needs.
 */
function isSchemaStoreSchema(value: unknown): value is SchemaStoreSchema {
    if (!isRecord(value)) {
        return false;
    }

    const { fileMatch, url } = value;
    return isStringArray(fileMatch) && typeof url === "string";
}

/**
 * Check whether a value is an array of strings.
 */
function isStringArray(value: unknown): value is string[] {
    return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
    );
}

/**
 * Check whether parser services describe a TOML program.
 */
function isTOMLProgram(
    sourceCode: SourceCode,
    _node: unknown
): _node is TOML.TOMLProgram {
    return (
        sourceCode.parserServices?.isTOML === true &&
        isRecord(_node) &&
        _node["type"] === "Program"
    );
}

/**
 * Check whether parser services describe a YAML program.
 */
function isYAMLProgram(
    sourceCode: SourceCode,
    _node: unknown
): _node is YAML.YAMLProgram {
    return (
        sourceCode.parserServices?.isYAML === true &&
        isRecord(_node) &&
        _node["type"] === "Program"
    );
}

/**
 * Check if filename matches a schema fileMatch entry.
 */
function matchFile(filename: string, fileMatch: readonly string[]): boolean {
    return (
        arrayIncludes(fileMatch, path.basename(filename)) ||
        fileMatch.some((fm) => minimatch(filename, fm, { dot: true }))
    );
}

/**
 * Merge validators into one validator.
 */
function mergeValidators(validators: readonly Validator[]): Validator {
    return (data: unknown) => {
        const errors: ValidateError[] = [];
        for (const validator of validators) {
            errors.push(...validator(data));
        }
        return errors;
    };
}

/**
 * Resolve one configured schema entry into a validator.
 */
function optionSchemaToValidator(
    schemaData: OptionSchema,
    context: RuleContext
): null | Validator {
    if (typeof schemaData.schema === "string") {
        const schemaValidator = schemaPathToValidator(
            schemaData.schema,
            context
        );
        if (isPresent(schemaValidator)) {
            return schemaValidator;
        }
        reportCannotResolvedPath(schemaData.schema, context);
        return null;
    }

    const schemaValidator = schemaObjectToValidator(schemaData.schema, context);
    if (isPresent(schemaValidator)) {
        return schemaValidator;
    }
    reportCannotResolvedObject(context);
    return null;
}

/**
 * Get mergeSchemas option.
 */
function parseMergeSchemasOption(option: unknown): null | SchemaKind[] {
    if (option === true) {
        return [...SCHEMA_KINDS];
    }
    if (!Array.isArray(option)) {
        return null;
    }

    const schemaKinds: SchemaKind[] = [];
    for (const value of option) {
        if (!isSchemaKind(value)) {
            return null;
        }
        schemaKinds.push(value);
    }
    return schemaKinds.toSorted(
        (a, b) => SCHEMA_KINDS.indexOf(a) - SCHEMA_KINDS.indexOf(b)
    );
}

/**
 * Get reportMode option.
 */
function parseReportModeOption(option: unknown): ReportMode {
    return isReportMode(option) ? option : "all";
}

/**
 * Convert a source range to a source location.
 */
function rangeToLocation(
    sourceCode: SourceCode,
    range: readonly [number, number]
): JSONAST.SourceLocation {
    return {
        end: sourceCode.getLocFromIndex(range[1]),
        start: sourceCode.getLocFromIndex(arrayFirst(range)),
    };
}

/**
 * Report for cannot resolved schema object.
 */
function reportCannotResolvedObject(context: RuleContext) {
    context.report({
        loc: { column: 0, line: 1 },
        messageId: "cannotResolveSchema",
    });
}

/**
 * Report for cannot resolved schema path.
 */
function reportCannotResolvedPath(schemaPath: string, context: RuleContext) {
    context.report({
        data: { schemaPath },
        loc: { column: 0, line: 1 },
        messageId: "cannotResolveSchemaPath",
    });
}

/**
 * Generate validator from schema object.
 */
function schemaObjectToValidator(
    schema: null | SchemaObject,
    context: RuleContext
): null | Validator {
    if (!isPresent(schema)) {
        return null;
    }
    const schemaPath = context.cwd;
    return compile(schema, schemaPath, context);
}

/**
 * Generate validator from schema path.
 */
function schemaPathToValidator(
    schemaPath: string,
    context: RuleContext
): null | Validator {
    const schema = loadSchema(schemaPath, context);
    if (!isPresent(schema)) {
        return null;
    }
    return compile(schema, schemaPath, context);
}
