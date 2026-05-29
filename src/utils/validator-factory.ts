import v6Schema from "ajv/lib/refs/json-schema-draft-06.json" with { type: "json" };
import { draft7 as migrateToDraft7 } from "json-schema-migrate-x";
import {
    arrayFirst,
    arrayJoin,
    isEmpty,
    objectKeys,
    stringSplit,
} from "ts-extras";

import type { RuleContext } from "../types.ts";
import type {
    DefinedError,
    ErrorObject,
    RegExpEngine,
    SchemaObject,
    ValidateFunction,
} from "./ajv.ts";

import { Ajv } from "./ajv.ts";
import { loadSchema } from "./schema.ts";

const lazyRegExpEngine: RegExpEngine = Object.assign(
    (str: string, flags: string) => {
        let error: Error;
        try {
            return new RegExp(str, flags);
        } catch (error_) {
            error = error_ as never;
        }
        if (flags.includes("u")) {
            return new RegExp(str, flags.replace("u", ""));
        }
        throw error;
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

export interface ValidateError {
    message: string;
    path: string[];
}

export type Validator = (data: unknown) => ValidateError[];

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
 * Schema error to validate error.
 */
function errorToValidateError(errorObject: ErrorObject): ValidateError {
    const error: DefinedError = errorObject as DefinedError;

    const instancePath = error.instancePath.startsWith("/")
        ? error.instancePath.slice(1)
        : error.instancePath;
    // Console.log(instancePath)
    const path: string[] = instancePath
        ? stringSplit(instancePath, "/").map(unescapeFragment)
        : [];

    if (error.keyword === "additionalProperties") {
        path.push(error.params.additionalProperty);
        return {
            message: `Unexpected property ${joinPath(path)}`,
            path,
        };
    }
    if (error.keyword === "propertyNames") {
        return {
            message: `${joinPath(path)} property name ${JSON.stringify(
                error.params.propertyName
            )} is invalid.`,
            path: [...path, error.params.propertyName],
        };
    }
    if (error.keyword === "uniqueItems") {
        const baseMessage = `must NOT have duplicate items (items ## ${error.params.j} and ${error.params.i} are identical)`;
        return {
            message: `${joinPath(path)} ${baseMessage}.`,
            path: [...path, String(error.params.i)],
        };
    }
    let baseMessage: string;
    switch (error.keyword) {
        case "additionalItems":
        case "anyOf":
        case "contains":
        case "dependencies":
        case "exclusiveMaximum":
        case "exclusiveMinimum":
        case "format":
        case "if":
        case "maximum":
        case "maxItems":
        case "maxLength":
        case "maxProperties":
        case "minimum":
        case "minItems":
        case "minLength":
        case "minProperties":
        case "multipleOf":
        case "oneOf":
        case "pattern":
        case "required":
        case "type": {
            // Use error.message
            baseMessage = error.message!;

            break;
        }
        case "const": {
            baseMessage = `must be equal to ${JSON.stringify(
                error.params.allowedValue
            )}`;

            break;
        }
        case "enum": {
            baseMessage = `must be equal to ${joinEnums(error.params.allowedValues)}`;

            break;
        }
        case "not": {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ignore
            const schema: any = error.schema!;
            const schemaKeys = objectKeys(schema);
            if (schemaKeys.length === 1 && arrayFirst(schemaKeys) === "type") {
                // { type: "foo" }
                baseMessage = `must NOT be ${schema.type}`;
            } else if (
                schemaKeys.length === 1 &&
                arrayFirst(schemaKeys) === "enum"
            ) {
                // { enum: ["foo"] }
                baseMessage = `must NOT be equal to ${joinEnums(schema.enum)}`;
            } else {
                baseMessage = "must NOT be valid of define schema";
            }

            break;
        }
        default: {
            // Others
            baseMessage = error.message!;
        }
    }

    if (error.propertyName) {
        return {
            message: `${joinPath(path)} property name ${JSON.stringify(
                error.propertyName
            )} ${baseMessage}.`,
            path: [...path, error.propertyName],
        };
    }
    /** Join enums */
    function joinEnums(enums: string[]) {
        const list = enums.map((v: string) => JSON.stringify(v));
        const last = list.pop();
        if (list.length > 0) {
            return `${arrayJoin(list, ", ")} or ${last}`;
        }
        return last;
    }
    function joinPath(paths: string[]) {
        if (isEmpty(paths)) {
            return "Root";
        }
        let result = "";
        for (const p of paths) {
            if (/^[$a-z_][\w$]*$/iv.test(p)) {
                if (result) {
                    result += `.${p}`;
                } else {
                    result = p;
                }
            } else {
                result += `[${/^\d+$/v.test(p) ? p : JSON.stringify(p)}]`;
            }
        }
        return `"${result}"`;
    }
    return {
        message: `${joinPath(path)} ${baseMessage}.`,
        path,
    };
}

/**
 * Resolve Schema Error
 */
function resolveError(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ignore
    error: any,
    baseSchemaPath: string,
    baseSchema: SchemaObject,
    context: RuleContext
): boolean {
    if (error.missingRef) {
        let schemaPath = "";
        let schemaId = "";
        if (
            error.missingRef.startsWith("https://") ||
            error.missingRef.startsWith("https://") ||
            error.missingRef.startsWith("vscode://")
        ) {
            const uri = new URL(error.missingRef);
            uri.hash = "";
            schemaPath = uri.toString();
            schemaId = schemaPath;
        } else {
            const ref = error.missingRef;
            const baseUri = new URL(baseSchema.$id || baseSchemaPath);
            baseUri.hash = "";
            const slashIndex = baseUri.pathname.lastIndexOf("/");
            if (slashIndex !== -1) {
                baseUri.pathname = baseUri.pathname.slice(0, slashIndex + 1);
            }
            const uri = new URL(`${baseUri.toString()}${ref}`);
            uri.hash = "";
            schemaPath = uri.toString();
            schemaId = ref.split("#")[0];
        }
        if (schemaPath) {
            const refSchema = loadSchema(schemaPath, context);

            if (refSchema) {
                while (true) {
                    try {
                        ajv.addSchema(refSchema, schemaId);
                    } catch (error_) {
                        if (
                            resolveError(error_, schemaPath, refSchema, context)
                        ) {
                            continue;
                        }
                        throw error_;
                    }
                    break;
                }
                return true;
            }
        }
    }

    return false;
}

/**
 * Build validator
 */
function schemaToValidator(
    schema: SchemaObject,
    schemaPath: string,
    context: RuleContext
): Validator {
    let validateSchema: ValidateFunction;

    let schemaObject = schema;
    while (true) {
        try {
            if (
                typeof schemaObject.$id === "string" &&
                ajv.getSchema(schemaObject.$id.replace(/#$/v, ""))
            ) {
                ajv.removeSchema(schemaObject.$id.replace(/#$/v, ""));
            }
            validateSchema = ajv.compile(schemaObject);
        } catch (error) {
            if (
                ((error as Error).message ===
                    'NOT SUPPORTED: keyword "id", use "$id" for schema ID' ||
                    /exclusive(?:Maximum|Minimum) value must be .*"number".*/v.test(
                        (error as Error).message
                    )) &&
                schema === schemaObject
            ) {
                schemaObject = JSON.parse(JSON.stringify(schemaObject));
                migrateToDraft7(schemaObject);
                continue;
            }
            if (resolveError(error, schemaPath, schemaObject, context)) {
                continue;
            }
            // eslint-disable-next-line no-console -- log
            console.error(schemaPath);
            throw error;
        }
        break;
    }

    return (data) => {
        if (validateSchema(data)) {
            return [];
        }

        return validateSchema.errors!.map(errorToValidateError);
    };
}

/** @see https://github.com/ajv-validator/ajv/blob/e816cd24b60068b3937dc7143beeab3fe6612391/lib/compile/util.ts#L59 */
function unescapeFragment(str: string): string {
    return unescapeJsonPointer(decodeURIComponent(str));
}

/** @see https://github.com/ajv-validator/ajv/blob/e816cd24b60068b3937dc7143beeab3fe6612391/lib/compile/util.ts#L72 */
function unescapeJsonPointer(str: string): string {
    return str.replaceAll("~1", "/").replaceAll("~0", "~");
}
