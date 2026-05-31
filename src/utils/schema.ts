import type { UnknownRecord } from "type-fest";

import debugBuilder from "debug";
import { draft7 as migrateToDraft7 } from "json-schema-migrate-x";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
    isDefined,
    isEmpty,
    isPresent,
    keyIn,
    objectKeys,
    setHas,
} from "ts-extras";

import type { RuleContext } from "../types.js";
import type { SchemaObject } from "./types.js";

import * as meta from "../meta.js";
import { get } from "./http-client/http.js";
import { syncGet } from "./http-client/sync-http.js";

const debug = debugBuilder(
    "eslint-plugin-json-schema-validator-2:utils-schema"
);

const DEFAULT_CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days
const RELOADING = new Set<string>();
const moduleFilename =
    typeof __filename === "string"
        ? __filename
        : // eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.filename is not available across the configured Node range.
          fileURLToPath(import.meta.url);
const moduleDirname =
    typeof __dirname === "string" ? __dirname : path.dirname(moduleFilename);
const WORKSPACE_CACHE_DIRECTORY = path.join(".cache", meta.name);

interface CacheEntry {
    data: unknown;
    timestamp: number;
}

/**
 * Load json data
 */
export function loadJson(jsonPath: string, context: RuleContext): unknown {
    return loadJsonInternal(jsonPath, context);
}
/**
 * Load schema data
 */
export function loadSchema(
    schemaPath: string,
    context: RuleContext
): null | SchemaObject {
    const loadedSchema = loadJsonInternalWithEdit(
        schemaPath,
        context,
        (schema_) => {
            if (!isSchemaObject(schema_)) {
                context.report({
                    loc: { column: 0, line: 1 },
                    message: `Could not be parsed JSON schema: "${schemaPath}"`,
                });
                return null;
            }
            const schema = schema_;
            migrateToDraft7(schema);
            return schema;
        }
    );
    return loadedSchema === null || isSchemaObject(loadedSchema)
        ? loadedSchema
        : null;
}

/**
 * Find the nearest node_modules ancestor for the installed plugin package.
 */
function findNodeModulesDirectory(startDirectory: string): null | string {
    let currentDirectory = path.resolve(startDirectory);
    while (true) {
        if (path.basename(currentDirectory) === "node_modules") {
            return currentDirectory;
        }

        const parentDirectory = path.dirname(currentDirectory);
        if (parentDirectory === currentDirectory) {
            return null;
        }
        currentDirectory = parentDirectory;
    }
}

/**
 * Resolve a nested property path from unknown JSON-like data.
 */
function getNestedProperty(value: unknown, keys: readonly string[]): unknown {
    let current = value;
    for (const key of keys) {
        if (!isRecord(current)) {
            return undefined;
        }
        current = current[key];
    }
    return current;
}

/**
 * Check whether parsed cache data has the expected wrapper shape.
 */
function isCacheEntry(value: unknown): value is CacheEntry {
    return (
        isRecord(value) &&
        keyIn(value, "data") &&
        typeof value["timestamp"] === "number"
    );
}

/**
 * Check whether a value is an object record.
 */
function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check whether a schema path points at a remote HTTP(S) URL.
 */
function isRemoteSchemaUrl(schemaPath: string): boolean {
    try {
        const url = new URL(schemaPath);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

/**
 * Check whether a parsed value can be treated as a schema object.
 */
function isSchemaObject(value: unknown): value is SchemaObject {
    return isRecord(value);
}

/**
 * Load schema data from url
 */
function loadJsonFromURL(
    jsonPath: string,
    context: RuleContext,
    edit?: (json: unknown) => unknown
): unknown {
    let jsonFileName = jsonPath.replace(/^https?:\/\//v, "");
    if (!jsonFileName.endsWith(".json")) {
        jsonFileName = `${jsonFileName}.json`;
    }
    const cacheSettings = context.settings["json-schema-validator-2"]?.cache;
    const configuredCacheDirectory = cacheSettings?.directory;
    const cacheDirectory = resolveCacheDirectory(
        configuredCacheDirectory,
        context
    );
    const cacheTtl = cacheSettings?.ttl ?? DEFAULT_CACHE_TTL;
    const jsonFilePath = resolveWritableCacheFilePath(
        cacheDirectory,
        configuredCacheDirectory,
        context,
        jsonFileName
    );

    const options = context.settings["json-schema-validator-2"]?.http;

    const httpRequestOptions = options?.requestOptions ?? {};
    const httpGetModulePath = resolvePath(options?.getModulePath, context);

    let cacheEntry: CacheEntry | undefined;
    try {
        // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename -- ESLint rules load schema cache synchronously during rule creation.
        const jsonText = fs.readFileSync(jsonFilePath);
        const cacheData: unknown = JSON.parse(jsonText.toString("utf8"));
        if (isCacheEntry(cacheData)) {
            cacheEntry = cacheData;
        }
    } catch {
        // Ignore missing or invalid local cache entries.
    }

    if (isPresent(cacheEntry)) {
        if (
            cacheTtl !== false &&
            cacheEntry.timestamp + cacheTtl < Date.now() && // Reload!
            // However, the data can actually be used the next time access it.
            !setHas(RELOADING, jsonFilePath)
        ) {
            RELOADING.add(jsonFilePath);
            void (async () => {
                try {
                    const json = await get(
                        jsonPath,
                        httpRequestOptions,
                        httpGetModulePath
                    );
                    postProcess(jsonPath, jsonFilePath, json, context, edit);
                } finally {
                    RELOADING.delete(jsonFilePath);
                }
            })();
        }
        return isDefined(edit) ? edit(cacheEntry.data) : cacheEntry.data;
    }

    let json: string;
    try {
        json = syncGet(jsonPath, httpRequestOptions, httpGetModulePath);
    } catch (error) {
        debug(error instanceof Error ? error.message : String(error));
        // Context.report({
        //     loc: { line: 1, column: 0 },
        //     message: `Could not be resolved: "${schemaPath}"`,
        // })
        return null;
    }

    return postProcess(jsonPath, jsonFilePath, json, context, edit);
}

/**
 * Load json data. Can insert a data editing process.
 */
function loadJsonInternal(
    jsonPath: string,
    context: RuleContext,
    edit?: (json: unknown) => unknown
): unknown {
    return loadJsonInternalWithEdit(jsonPath, context, edit);
}

function loadJsonInternalWithEdit(
    jsonPath: string,
    context: RuleContext,
    edit: ((json: unknown) => unknown) | undefined
): unknown {
    if (isRemoteSchemaUrl(jsonPath)) {
        return loadJsonFromURL(normalizeSchemaUrl(jsonPath), context, edit);
    }
    if (jsonPath.startsWith("vscode://")) {
        let url = `https://raw.githubusercontent.com/ota-meshi/extract-vscode-schemas/main/resources/vscode/${jsonPath.slice(
            9
        )}`;
        if (!url.endsWith(".json")) {
            url = `${url}.json`;
        }
        return loadJsonFromURL(url, context, (orig) => {
            const result = isDefined(edit) ? edit(orig) : orig;
            if (jsonPath === "vscode://schemas/settings/machine") {
                // Adjust `vscode://schemas/settings/machine` resource to avoid bugs.
                const target = getNestedProperty(result, [
                    "properties",
                    "workbench.externalUriOpeners",
                    "additionalProperties",
                    "anyOf",
                ]);
                removeEmptyEnum(target);
            } else if (jsonPath === "vscode://schemas/launch") {
                // Adjust `vscode://schemas/launch` resource to avoid bugs.
                const target = getNestedProperty(result, [
                    "properties",
                    "compounds",
                    "items",
                    "properties",
                    "configurations",
                    "items",
                    "oneOf",
                ]);
                removeEmptyEnum(target);
            }
            return result;
        });
    }
    // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename -- ESLint rule creation must synchronously load local schema files configured by the user.
    const json = fs.readFileSync(path.resolve(context.cwd, jsonPath));
    const data: unknown = JSON.parse(json.toString("utf8"));
    return isDefined(edit) ? edit(data) : data;
}

/**
 * Normalize schema URL to use the official schemastore domain.
 */
function normalizeSchemaUrl(url: string): string {
    for (const prefix of [
        "https://json.schemastore.org/",
        "https://www.schemastore.org/",
        "https://json.schemastore.org/",
        "https://www.schemastore.org/",
    ]) {
        if (url.startsWith(prefix)) {
            return `https://www.schemastore.org/${url.slice(prefix.length)}`;
        }
    }
    return url;
}

/**
 * Post process
 */
function postProcess(
    schemaUrl: string,
    jsonFilePath: string,
    json: string,
    context: RuleContext,
    edit: ((json: unknown) => unknown) | undefined
): unknown {
    let parsedJson: unknown;
    try {
        parsedJson = JSON.parse(json);
    } catch {
        context.report({
            loc: { column: 0, line: 1 },
            message: `Could not be parsed JSON: "${schemaUrl}"`,
        });
        return null;
    }

    const data = isDefined(edit) ? edit(parsedJson) : parsedJson;

    // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename -- Schema cache writes are deterministic and must complete before rule validation returns data.
    fs.writeFileSync(
        jsonFilePath,
        schemaStringify({
            data,
            timestamp: Date.now(),
            v: meta.version,
        })
    );
    return data;
}

/** Remove empty `enum:` schema */
function removeEmptyEnum(target: unknown): void {
    if (!isPresent(target)) return;
    if (Array.isArray(target)) {
        for (const e of target) {
            removeEmptyEnum(e);
        }
        return;
    }
    if (!isRecord(target)) {
        return;
    }
    const schemaEnum = target["enum"];
    if (Array.isArray(schemaEnum) && isEmpty(schemaEnum)) {
        delete target["enum"];
        return;
    }
    const { properties } = target;
    if (
        target["type"] === "object" &&
        isPresent(properties) &&
        isRecord(properties)
    ) {
        for (const key of objectKeys(properties)) {
            removeEmptyEnum(properties[key]);
        }
    }
}

/**
 * Resolve the schema cache directory from shared plugin settings.
 */
function resolveCacheDirectory(
    cacheDirectory: string | undefined,
    context: RuleContext
): string {
    if (!isDefined(cacheDirectory) || cacheDirectory === "") {
        return resolveDefaultCacheDirectory(context);
    }
    if (path.isAbsolute(cacheDirectory)) {
        return cacheDirectory;
    }
    return path.resolve(context.cwd, cacheDirectory);
}

/**
 * Resolve the default schema cache directory.
 */
function resolveDefaultCacheDirectory(context: RuleContext): string {
    const nodeModulesDirectory = findNodeModulesDirectory(moduleDirname);
    return isPresent(nodeModulesDirectory)
        ? path.join(nodeModulesDirectory, ".cache", meta.name)
        : resolveWorkspaceCacheDirectory(context);
}

/**
 * Resolve module path
 */
function resolvePath(
    modulePath: string | undefined,
    context: RuleContext
): string | undefined {
    if (!isDefined(modulePath) || modulePath === "") {
        return undefined;
    }
    if (modulePath.startsWith(".")) {
        return path.join(context.cwd, modulePath);
    }
    return modulePath;
}

/**
 * Resolve the workspace-local schema cache directory.
 */
function resolveWorkspaceCacheDirectory(context: RuleContext): string {
    return path.resolve(context.cwd, WORKSPACE_CACHE_DIRECTORY);
}

/**
 * Resolve a writable cache file path and create its containing directory.
 *
 * @throws When an explicit cache directory cannot be created, or when both the
 *   default package cache and workspace fallback cannot be created.
 */
function resolveWritableCacheFilePath(
    cacheDirectory: string,
    configuredCacheDirectory: string | undefined,
    context: RuleContext,
    jsonFileName: string
): string {
    const jsonFilePath = path.join(cacheDirectory, jsonFileName);
    try {
        // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename -- ESLint rules are synchronous and cache schemas under a deterministic plugin-owned path.
        fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });
        return jsonFilePath;
    } catch (error) {
        const fallbackCacheDirectory = resolveWorkspaceCacheDirectory(context);
        const hasExplicitCacheDirectory =
            isDefined(configuredCacheDirectory) &&
            configuredCacheDirectory !== "";
        if (
            hasExplicitCacheDirectory ||
            cacheDirectory === fallbackCacheDirectory
        ) {
            throw error;
        }
        const fallbackJsonFilePath = path.join(
            fallbackCacheDirectory,
            jsonFileName
        );
        // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename -- Falls back to a deterministic workspace-local cache when the package cache cannot be created.
        fs.mkdirSync(path.dirname(fallbackJsonFilePath), { recursive: true });
        return fallbackJsonFilePath;
    }
}

/**
 * JSON Schema to string
 */
function schemaStringify(schema: SchemaObject): string {
    return JSON.stringify(schema);
}
