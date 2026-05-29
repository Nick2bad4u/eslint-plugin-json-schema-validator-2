import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { safeCastTo } from "ts-extras";
import { describe, expect, it } from "vitest";

import type { RuleContext } from "../../../src/types";

import { loadJson } from "../../../src/utils/schema";

// eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../../..");
const STATIC_JSON_MODULE_PATH = path.resolve(
    TEST_DIR,
    "http-client/get-modules/static-json.mjs"
);
const CACHE_DIRECTORY = path.join(REPO_ROOT, ".temp/schema-cache-test");

describe("schema cache settings", () => {
    it("writes remote JSON data into the configured cache directory", () => {
        expect.assertions(2);

        fs.rmSync(CACHE_DIRECTORY, { force: true, recursive: true });

        const context = safeCastTo<RuleContext>({
            cwd: REPO_ROOT,
            filename: path.join(TEST_DIR, "cache-test.json"),
            getAncestors: () => [],
            id: "json-schema-validator-2/no-invalid",
            options: [],
            parserPath: "",
            parserServices: {},
            physicalFilename: path.join(TEST_DIR, "cache-test.json"),
            report: () => {},
            settings: {
                "json-schema-validator-2": {
                    cache: {
                        directory: CACHE_DIRECTORY,
                        ttl: false,
                    },
                    http: {
                        getModulePath: STATIC_JSON_MODULE_PATH,
                        requestOptions: {},
                    },
                },
            },
            sourceCode: {} as RuleContext["sourceCode"],
        });

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
});
