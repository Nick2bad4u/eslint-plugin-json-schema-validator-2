import type { Logger } from "ajv/dist/core.js";
import type { RegExpEngine } from "ajv/dist/types/index.js";
import type { UnknownArray, UnknownRecord } from "type-fest";

import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import { formatNames, fullFormats } from "ajv-formats/dist/formats.js";
import v6Schema from "ajv/lib/refs/json-schema-draft-06.json" with { type: "json" };
import {
    getAjv as getSchemaMigrationAjv,
    draft7 as migrateToDraft7,
} from "json-schema-migrate-x";
import {
    arrayAt,
    arrayFirst,
    arrayJoin,
    assertDefined,
    isDefined,
    isEmpty,
    keyIn,
    objectKeys,
    setHas,
    stringSplit,
} from "ts-extras";

import type { RuleContext } from "../types.js";
import type { SchemaObject } from "./types.js";

import { loadSchema } from "./schema.js";

const lazyRegExpEngine: RegExpEngine = Object.assign(
    (str: string, flags: string) => {
        let thrownError: Error | undefined;
        try {
            // eslint-disable-next-line security/detect-non-literal-regexp -- Ajv must compile schema-provided regex patterns through this hook.
            return new RegExp(str, flags);
        } catch (error_) {
            thrownError = toError(error_);
        }
        if (flags.includes("u")) {
            // eslint-disable-next-line security/detect-non-literal-regexp -- Ajv fallback keeps validating the same schema pattern without the unicode flag.
            return new RegExp(str, flags.replace("u", ""));
        }
        throw thrownError;
    },
    { code: "new RegExp" }
);

const ajv = new Ajv({
    // SchemaId: "auto",
    allErrors: true,
    code: {
        regExp: lazyRegExpEngine,
    },
    // MissingRefs: "ignore",
    // extendRefs: "ignore",
    logger: false,
    strict: false,
    validateSchema: false,
    verbose: true,
});
// Ajv.addMetaSchema(require("ajv/lib/refs/json-schema-draft-04.json"))
ajv.addMetaSchema(v6Schema);
for (const formatName of formatNames) {
    ajv.addFormat(formatName, fullFormats[formatName]);
}

const noopLoggerMethod = (): undefined => undefined;
const silentSchemaMigrationLogger = {
    error: noopLoggerMethod,
    log: noopLoggerMethod,
    warn: noopLoggerMethod,
} satisfies Logger;

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- TypeScript resolves json-schema-migrate-x's Ajv return type, but typed ESLint cannot resolve the package's AjvCore.default declaration.
const schemaMigrationAjv: SchemaMigrationLoggerTarget =
    getSchemaMigrationAjv("draft7");
schemaMigrationAjv.logger = silentSchemaMigrationLogger;

/**
 * Validation failure reported by a compiled JSON Schema validator.
 */
export interface ValidateError {
    message: string;
    path: string[];
}

/**
 * Validate unknown data and return normalized validation failures.
 */
export type Validator = (data: unknown) => ValidateError[];

interface AdditionalPropertyParams {
    additionalProperty: string;
}

interface AjvError {
    instancePath: string;
    keyword: string;
    message: string | undefined;
    params: unknown;
    propertyName: string | undefined;
    schema: unknown;
}

interface ConstParams {
    allowedValue: unknown;
}

interface EnumParams {
    allowedValues: Readonly<UnknownArray>;
}

interface PropertyNameParams {
    propertyName: string;
}

interface ResolvedSchemaReference {
    schemaId: string;
    schemaPath: string;
}

interface SchemaMigrationLoggerTarget {
    logger: Logger;
}

interface UniqueItemsParams {
    i: number;
    j: number;
}

const keywordsUsingAjvMessage = new Set<string>([
    "additionalItems",
    "anyOf",
    "contains",
    "dependencies",
    "dependentRequired",
    "discriminator",
    "exclusiveMaximum",
    "exclusiveMinimum",
    "false schema",
    "format",
    "if",
    "items",
    "maximum",
    "maxItems",
    "maxLength",
    "maxProperties",
    "minimum",
    "minItems",
    "minLength",
    "minProperties",
    "multipleOf",
    "oneOf",
    "pattern",
    "required",
    "type",
    "unevaluatedItems",
    "unevaluatedProperties",
]);

/**
 * Compile JSON Schema
 */
export function compile(
    schema: SchemaObject,
    schemaPath: string,
    context: RuleContext
): Validator {
    return schemaToValidator(schema, schemaPath, context);
}
/**
 * Add a referenced schema, resolving nested missing references first.
 *
 * @throws When AJV cannot add the referenced schema.
 */
function addSchemaWithResolvedReferences(
    refSchema: SchemaObject,
    resolvedReference: ResolvedSchemaReference,
    context: RuleContext
): void {
    let shouldRetry = true;
    while (shouldRetry) {
        shouldRetry = false;
        try {
            ajv.addSchema(refSchema, resolvedReference.schemaId);
        } catch (error) {
            if (
                resolveError(
                    error,
                    resolvedReference.schemaPath,
                    refSchema,
                    context
                )
            ) {
                shouldRetry = true;
            } else {
                throw error;
            }
        }
    }
}

/** Format an AJV validation message, falling back when AJV omits it. */
function ajvMessage(error: AjvError): string {
    return error.message ?? "is invalid";
}

/** Describe a negated schema from AJV's `not` validation error payload. */
function describeNotSchema(schema: unknown): string {
    if (!isRecord(schema)) {
        return "must NOT be valid of define schema";
    }

    const schemaKeys = objectKeys(schema);
    const schemaKey =
        schemaKeys.length === 1 ? arrayFirst(schemaKeys) : undefined;
    if (schemaKey === "type") {
        return `must NOT be ${formatSchemaType(schema["type"])}`;
    }
    if (schemaKey === "enum" && Array.isArray(schema["enum"])) {
        return `must NOT be equal to ${joinEnums(schema["enum"])}`;
    }
    return "must NOT be valid of define schema";
}

/**
 * Schema error to validate error.
 */
function errorToValidateError(errorObject: ErrorObject): ValidateError {
    const error = normalizeAjvError(errorObject);
    const instancePath = error.instancePath.startsWith("/")
        ? error.instancePath.slice(1)
        : error.instancePath;
    // Console.log(instancePath)
    const path: string[] = instancePath
        ? stringSplit(instancePath, "/").map((fragment) =>
              unescapeFragment(fragment)
          )
        : [];

    if (
        error.keyword === "additionalProperties" &&
        isAdditionalPropertyParams(error.params)
    ) {
        path.push(error.params.additionalProperty);
        return {
            message: `Unexpected property ${joinPath(path)}`,
            path,
        };
    }
    if (
        error.keyword === "propertyNames" &&
        isPropertyNameParams(error.params)
    ) {
        return {
            message: `${joinPath(path)} property name ${JSON.stringify(
                error.params.propertyName
            )} is invalid.`,
            path: [...path, error.params.propertyName],
        };
    }
    if (error.keyword === "uniqueItems" && isUniqueItemsParams(error.params)) {
        const duplicateIndex = String(error.params.i);
        const firstIndex = String(error.params.j);
        const baseMessage = `must NOT have duplicate items (items ## ${firstIndex} and ${duplicateIndex} are identical)`;
        return {
            message: `${joinPath(path)} ${baseMessage}.`,
            path: [...path, duplicateIndex],
        };
    }
    const baseMessage = getBaseMessage(error);

    if (isDefined(error.propertyName)) {
        return {
            message: `${joinPath(path)} property name ${JSON.stringify(
                error.propertyName
            )} ${baseMessage}.`,
            path: [...path, error.propertyName],
        };
    }
    return {
        message: `${joinPath(path)} ${baseMessage}.`,
        path,
    };
}

/** Format a schema `type` value from a `not` keyword schema. */
function formatSchemaType(schemaType: unknown): string {
    if (Array.isArray(schemaType)) {
        if (schemaType.every((item) => typeof item === "string")) {
            return arrayJoin(schemaType, ",");
        }
        return joinEnums(schemaType);
    }
    if (typeof schemaType === "string") {
        return schemaType;
    }
    return formatValue(schemaType);
}

/** Format an unknown value for inclusion in a validation message. */
function formatValue(value: unknown): string {
    if (!isDefined(value) || typeof value === "symbol") {
        return String(value);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

/** Get the normalized base validation message for an AJV error. */
function getBaseMessage(error: AjvError): string {
    if (setHas(keywordsUsingAjvMessage, error.keyword)) {
        return ajvMessage(error);
    }
    if (error.keyword === "const" && isConstParams(error.params)) {
        return `must be equal to ${formatValue(error.params.allowedValue)}`;
    }
    if (error.keyword === "enum" && isEnumParams(error.params)) {
        return `must be equal to ${joinEnums(error.params.allowedValues)}`;
    }
    if (error.keyword === "not") {
        return describeNotSchema(error.schema);
    }
    return ajvMessage(error);
}

/** Extract AJV's untyped missing reference field from thrown errors. */
function getMissingRef(error: unknown): string | undefined {
    if (!isRecord(error)) {
        return undefined;
    }
    const missingRef = error["missingRef"];
    return typeof missingRef === "string" && missingRef !== ""
        ? missingRef
        : undefined;
}

/** Check whether a schema reference is already an absolute supported URI. */
function isAbsoluteSchemaReference(reference: string): boolean {
    const url = toSchemaUrl(reference);
    return (
        url?.protocol === "http:" ||
        url?.protocol === "https:" ||
        url?.protocol === "vscode:"
    );
}

/** Check for AJV `additionalProperties` params. */
function isAdditionalPropertyParams(
    value: unknown
): value is AdditionalPropertyParams {
    return isRecord(value) && typeof value["additionalProperty"] === "string";
}

/** Check for AJV `const` params. */
function isConstParams(value: unknown): value is ConstParams {
    return isRecord(value) && keyIn(value, "allowedValue");
}

/** Check for AJV `enum` params. */
function isEnumParams(value: unknown): value is EnumParams {
    return isRecord(value) && Array.isArray(value["allowedValues"]);
}

/** Check for AJV `propertyNames` params. */
function isPropertyNameParams(value: unknown): value is PropertyNameParams {
    return isRecord(value) && typeof value["propertyName"] === "string";
}

/** Check whether a value is a plain object record. */
function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Check for AJV `uniqueItems` params. */
function isUniqueItemsParams(value: unknown): value is UniqueItemsParams {
    return (
        isRecord(value) &&
        typeof value["i"] === "number" &&
        typeof value["j"] === "number"
    );
}

/** Join enum values for validation messages. */
function joinEnums(enums: Readonly<UnknownArray>): string {
    const list = enums.map((value) => formatValue(value));
    const last = list.pop();
    if (!isDefined(last)) {
        return "";
    }
    if (list.length > 0) {
        return `${arrayJoin(list, ", ")} or ${last}`;
    }
    return last;
}

/** Format a JSON pointer path for validation messages. */
function joinPath(paths: readonly string[]): string {
    if (isEmpty(paths)) {
        return "Root";
    }
    let result = "";
    for (const path of paths) {
        if (/^[$a-z_][\w$]*$/iv.test(path)) {
            result = result === "" ? path : `${result}.${path}`;
        } else {
            result += `[${/^\d+$/v.test(path) ? path : JSON.stringify(path)}]`;
        }
    }
    return `"${result}"`;
}

/** Copy the loose AJV ErrorObject into a local unknown-safe shape. */
function normalizeAjvError(errorObject: ErrorObject): AjvError {
    const params: unknown = errorObject.params;
    return {
        instancePath: errorObject.instancePath,
        keyword: errorObject.keyword,
        message: errorObject.message,
        params,
        propertyName: errorObject.propertyName,
        schema: errorObject.schema,
    };
}

/**
 * Resolve Schema Error
 *
 * @throws When AJV throws an error that is not a resolvable missing reference.
 */
function resolveError(
    error: unknown,
    baseSchemaPath: string,
    baseSchema: SchemaObject,
    context: RuleContext
): boolean {
    const missingRef = getMissingRef(error);
    if (!isDefined(missingRef)) {
        return false;
    }

    const resolvedReference = resolveSchemaReference(
        missingRef,
        baseSchemaPath,
        baseSchema
    );
    if (resolvedReference === null) {
        return false;
    }

    const refSchema = loadSchema(resolvedReference.schemaPath, context);
    if (refSchema === null) {
        return false;
    }

    addSchemaWithResolvedReferences(refSchema, resolvedReference, context);
    return true;
}

/** Resolve an AJV missing reference into a loadable schema URL and schema id. */
function resolveSchemaReference(
    missingRef: string,
    baseSchemaPath: string,
    baseSchema: SchemaObject
): null | ResolvedSchemaReference {
    if (isAbsoluteSchemaReference(missingRef)) {
        const uri = toSchemaUrl(missingRef);
        return uri === null
            ? null
            : { schemaId: uri.toString(), schemaPath: uri.toString() };
    }

    const baseSchemaId =
        typeof baseSchema.$id === "string" && baseSchema.$id !== ""
            ? baseSchema.$id
            : baseSchemaPath;
    const baseUri = toSchemaUrl(baseSchemaId);
    if (baseUri === null) {
        return null;
    }

    const slashIndex = baseUri.pathname.lastIndexOf("/");
    if (slashIndex !== -1) {
        baseUri.pathname = baseUri.pathname.slice(0, slashIndex + 1);
    }

    const uri = toSchemaUrl(missingRef, baseUri);
    if (uri === null) {
        return null;
    }
    const schemaId = arrayAt(stringSplit(missingRef, "#"), 0) ?? "";
    return { schemaId, schemaPath: uri.toString() };
}

/**
 * Build validator
 *
 * @throws When AJV cannot compile the schema.
 */
function schemaToValidator(
    schema: SchemaObject,
    schemaPath: string,
    context: RuleContext
): Validator {
    let validateSchema: undefined | ValidateFunction;

    let schemaObject = schema;
    let shouldRetry = true;
    while (shouldRetry) {
        shouldRetry = false;
        try {
            if (
                typeof schemaObject.$id === "string" &&
                ajv.getSchema(schemaObject.$id.replace(/#$/v, ""))
            ) {
                ajv.removeSchema(schemaObject.$id.replace(/#$/v, ""));
            }
            validateSchema = ajv.compile(schemaObject);
        } catch (error) {
            if (shouldMigrateToDraft7(error, schema, schemaObject)) {
                schemaObject = structuredClone(schemaObject);
                migrateToDraft7(schemaObject);
                shouldRetry = true;
            } else if (resolveError(error, schemaPath, schemaObject, context)) {
                shouldRetry = true;
            } else {
                const cause = toError(error);
                throw new Error(
                    `Failed to compile JSON schema at ${schemaPath}: ${cause.message}`,
                    { cause: error }
                );
            }
        }
    }

    assertDefined(validateSchema);

    return (data) => {
        if (validateSchema(data)) {
            return [];
        }

        return (validateSchema.errors ?? []).map((error) =>
            errorToValidateError(error)
        );
    };
}

/** Check whether a compile error can be fixed by migrating legacy schemas. */
function shouldMigrateToDraft7(
    error: unknown,
    originalSchema: SchemaObject,
    schemaObject: SchemaObject
): boolean {
    if (schemaObject !== originalSchema || !(error instanceof Error)) {
        return false;
    }
    return (
        error.message ===
            'NOT SUPPORTED: keyword "id", use "$id" for schema ID' ||
        /exclusive(?:Maximum|Minimum) value must be .*"number".*/v.test(
            error.message
        )
    );
}

/** Convert unknown thrown values into Error instances. */
function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

/** Build a URL and strip fragments, returning null for invalid inputs. */
function toSchemaUrl(input: string, base?: URL): null | URL {
    try {
        const uri = isDefined(base) ? new URL(input, base) : new URL(input);
        uri.hash = "";
        return uri;
    } catch {
        return null;
    }
}

/** @see https://github.com/ajv-validator/ajv/blob/e816cd24b60068b3937dc7143beeab3fe6612391/lib/compile/util.ts#L59 */
function unescapeFragment(str: string): string {
    return unescapeJsonPointer(decodeURIComponent(str));
}

/** @see https://github.com/ajv-validator/ajv/blob/e816cd24b60068b3937dc7143beeab3fe6612391/lib/compile/util.ts#L72 */
function unescapeJsonPointer(str: string): string {
    return str.replaceAll("~1", "/").replaceAll("~0", "~");
}
