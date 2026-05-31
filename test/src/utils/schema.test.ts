import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { safeCastTo } from "ts-extras";
import { describe, expect, it } from "vitest";

import type {
    JsonSchemaValidatorSettings,
    RuleContext,
} from "../../../src/types";

import { loadJson, loadSchema } from "../../../src/utils/schema";

// eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../../..");
const STATIC_JSON_MODULE_PATH = path.resolve(
    TEST_DIR,
    "http-client/get-modules/static-json.mjs"
);
const INVALID_JSON_MODULE_PATH = path.resolve(
    TEST_DIR,
    "http-client/get-modules/invalid-json.mjs"
);
const RELATIVE_STATIC_JSON_MODULE_PATH =
    "./test/src/utils/http-client/get-modules/static-json.mjs";
const CACHE_DIRECTORY = path.join(REPO_ROOT, ".temp/schema-cache-test");
const DEFAULT_WORKSPACE_CACHE_DIRECTORY = path.join(
    REPO_ROOT,
    ".cache",
    "eslint-plugin-json-schema-validator-2"
);
const RELATIVE_CACHE_DIRECTORY = ".temp/schema-cache-relative-test";

function createContext(
    overrides: Partial<RuleContext["settings"]["json-schema-validator-2"]> = {}
): RuleContext {
    return createContextWithSettings({
        cache: {
            directory: CACHE_DIRECTORY,
            ttl: false,
        },
        http: {
            getModulePath: STATIC_JSON_MODULE_PATH,
            requestOptions: {},
        },
        ...overrides,
    });
}

function createContextWithSettings(
    settings: JsonSchemaValidatorSettings
): RuleContext {
    return safeCastTo<RuleContext>({
        cwd: REPO_ROOT,
        filename: path.join(TEST_DIR, "cache-test.json"),
        id: "json-schema-validator-2/no-invalid",
        options: [],
        physicalFilename: path.join(TEST_DIR, "cache-test.json"),
        report: () => {},
        settings: {
            "json-schema-validator-2": settings,
        },
        sourceCode: {} as RuleContext["sourceCode"],
    });
}

describe("schema cache settings", () => {
    it("writes remote JSON data into the configured cache directory", () => {
        expect.assertions(2);

        fs.rmSync(CACHE_DIRECTORY, { force: true, recursive: true });

        const context = createContext();

        const data = loadJson("https://example.com/cache-test.json", context);

        expect(data).toStrictEqual({ cached: true });

        const cacheFile = path.join(
            CACHE_DIRECTORY,
            "example.com/cache-test.json"
        );
        const cacheDataText = fs.readFileSync(cacheFile).toString("utf8");

        expect(JSON.parse(cacheDataText)).toMatchObject({
            data: { cached: true },
        });
    });

    it("resolves relative cache directories from the ESLint current working directory", () => {
        expect.assertions(2);

        const resolvedCacheDirectory = path.join(
            REPO_ROOT,
            RELATIVE_CACHE_DIRECTORY
        );
        fs.rmSync(resolvedCacheDirectory, { force: true, recursive: true });

        const context = createContext({
            cache: {
                directory: RELATIVE_CACHE_DIRECTORY,
                ttl: false,
            },
        });

        const data = loadJson("https://example.com/cache-test.json", context);

        expect(data).toStrictEqual({ cached: true });
        expect(
            fs.existsSync(
                path.join(resolvedCacheDirectory, "example.com/cache-test.json")
            )
        ).toBe(true);
    });

    it("uses the workspace cache fallback when no cache directory is configured from a source checkout", () => {
        expect.assertions(2);

        fs.rmSync(DEFAULT_WORKSPACE_CACHE_DIRECTORY, {
            force: true,
            recursive: true,
        });

        const context = createContextWithSettings({
            http: {
                getModulePath: STATIC_JSON_MODULE_PATH,
                requestOptions: {},
            },
        });

        const data = loadJson("https://example.com/cache-test.json", context);

        expect(data).toStrictEqual({ cached: true });
        expect(
            fs.existsSync(
                path.join(
                    DEFAULT_WORKSPACE_CACHE_DIRECTORY,
                    "example.com/cache-test.json"
                )
            )
        ).toBe(true);
    });

    it("returns stale cached data while scheduling a refresh for expired entries", () => {
        expect.assertions(1);

        const cacheFile = path.join(
            CACHE_DIRECTORY,
            "example.com/cache-test.json"
        );
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(
            cacheFile,
            JSON.stringify({
                data: { cached: "stale" },
                timestamp: 0,
            })
        );

        const context = createContext({
            cache: {
                directory: CACHE_DIRECTORY,
                ttl: 1,
            },
        });

        expect(
            loadJson("https://example.com/cache-test.json", context)
        ).toStrictEqual({
            cached: "stale",
        });
    });

    it("normalizes VS Code schema URLs and removes empty enum arrays from known schemas", () => {
        expect.assertions(1);

        const cacheDirectory = path.join(
            ".temp",
            "schema-cache-vscode-extension-test"
        );
        fs.rmSync(path.join(REPO_ROOT, cacheDirectory), {
            force: true,
            recursive: true,
        });
        const context = createContext({
            cache: {
                directory: cacheDirectory,
                ttl: false,
            },
        });
        const data = loadJson("vscode://schemas/settings/machine", context);

        expect(data).toStrictEqual({
            properties: {
                "workbench.externalUriOpeners": {
                    additionalProperties: {
                        anyOf: [
                            {},
                            {
                                properties: {
                                    nested: {},
                                },
                                type: "object",
                            },
                        ],
                    },
                },
            },
            type: "object",
        });
    });

    it("loads VS Code schema URLs that already include the JSON extension", () => {
        expect.assertions(1);

        const context = createContext();
        const data = loadJson(
            "vscode://schemas/settings/machine.json",
            context
        );

        expect(data).toStrictEqual({
            properties: {
                "workbench.externalUriOpeners": {
                    additionalProperties: {
                        anyOf: [
                            {
                                enum: [],
                            },
                            {
                                properties: {
                                    nested: {
                                        enum: [],
                                    },
                                },
                                type: "object",
                            },
                        ],
                    },
                },
            },
            type: "object",
        });
    });

    it("handles known VS Code schemas whose adjusted path is absent", () => {
        expect.assertions(1);

        const context = createContext();

        expect(loadJson("vscode://schemas/launch", context)).toStrictEqual({
            properties: {
                compounds: {
                    items: {
                        properties: {
                            configurations: {
                                items: {
                                    oneOf: "not-an-object",
                                },
                            },
                        },
                    },
                },
            },
            type: "object",
        });
    });

    it("loads local JSON files without an edit callback", () => {
        expect.assertions(1);

        const localJsonPath = path.join(".temp", "local-json-data.json");
        const localJsonAbsolutePath = path.join(REPO_ROOT, localJsonPath);
        fs.mkdirSync(path.dirname(localJsonAbsolutePath), { recursive: true });
        fs.writeFileSync(
            localJsonAbsolutePath,
            JSON.stringify({ local: true })
        );

        expect(loadJson(localJsonPath, createContext())).toStrictEqual({
            local: true,
        });
    });

    it("resolves relative custom HTTP module paths from the ESLint current working directory", () => {
        expect.assertions(1);

        const context = createContext({
            cache: {
                directory: path.join(
                    ".temp",
                    "schema-cache-relative-module-test"
                ),
                ttl: false,
            },
            http: {
                getModulePath: RELATIVE_STATIC_JSON_MODULE_PATH,
                requestOptions: {},
            },
        });

        expect(
            loadJson("https://example.com/cache-test.json", context)
        ).toStrictEqual({
            cached: true,
        });
    });

    it("reports remote JSON that cannot be parsed", () => {
        expect.assertions(2);

        const reports: string[] = [];
        const context = safeCastTo<RuleContext>({
            ...createContext({
                cache: {
                    directory: path.join(
                        ".temp",
                        "schema-cache-invalid-json-test"
                    ),
                    ttl: false,
                },
                http: {
                    getModulePath: INVALID_JSON_MODULE_PATH,
                    requestOptions: {},
                },
            }),
            report: (descriptor) => {
                if (
                    "message" in descriptor &&
                    typeof descriptor.message === "string"
                ) {
                    reports.push(descriptor.message);
                }
            },
        });

        expect(
            loadJson("https://example.com/invalid-json.json", context)
        ).toBeNull();
        expect(reports).toStrictEqual([
            'Could not be parsed JSON: "https://example.com/invalid-json.json"',
        ]);
    });

    it("reports local files that do not contain a schema object", () => {
        expect.assertions(2);

        const invalidSchemaPath = path.join(
            ".temp",
            "invalid-schema-array.json"
        );
        const invalidSchemaAbsolutePath = path.join(
            REPO_ROOT,
            invalidSchemaPath
        );
        const reports: string[] = [];
        fs.mkdirSync(path.dirname(invalidSchemaAbsolutePath), {
            recursive: true,
        });
        fs.writeFileSync(invalidSchemaAbsolutePath, "[]");

        const context = safeCastTo<RuleContext>({
            ...createContext(),
            report: (descriptor) => {
                if (
                    "message" in descriptor &&
                    typeof descriptor.message === "string"
                ) {
                    reports.push(descriptor.message);
                }
            },
        });

        expect(loadSchema(invalidSchemaPath, context)).toBeNull();
        expect(reports).toStrictEqual([
            `Could not be parsed JSON schema: "${invalidSchemaPath}"`,
        ]);
    });
});
