import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import { get } from "../../../../src/utils/http-client/http";
import { syncGet } from "../../../../src/utils/http-client/sync-http";

const require = createRequire(import.meta.url);
const packageUrl =
    "https://raw.githubusercontent.com/ota-meshi/eslint-plugin-json-schema-validator/main/package.json";
const packageName = "eslint-plugin-json-schema-validator";

function parsePackageName(responseBody: string): string {
    const value = JSON.parse(responseBody) as { name?: unknown };

    if (typeof value.name !== "string") {
        throw new TypeError(
            "Expected package metadata to include a string name."
        );
    }

    return value.name;
}

describe("http get.", () => {
    it("should to receive a request.", async () => {
        expect.assertions(1);

        const res = await get(packageUrl);

        expect(parsePackageName(res)).toBe(packageName);
    });

    it("should to receive a request with option and sync.", () => {
        expect.assertions(1);

        const res = syncGet(
            packageUrl,
            {},
            require.resolve("./get-modules/request-get.mjs")
        );

        expect(parsePackageName(res)).toBe(packageName);
    });

    it("should to receive a request with a redirect.", async () => {
        expect.assertions(1);

        const res = await get(
            "https://unpkg.com/eslint-plugin-json-schema-validator/package.json"
        );

        expect(parsePackageName(res)).toBe(packageName);
    });

    it("should to receive a request with a redirect (2).", async () => {
        expect.assertions(1);

        const res = await get(
            "https://raw.github.com/ota-meshi/eslint-plugin-json-schema-validator/main/package.json"
        );

        expect(parsePackageName(res)).toBe(packageName);
    });

    it("should reject failed requests.", async () => {
        expect.assertions(1);

        await expect(
            get("https://example.invalid/package.json")
        ).rejects.toThrow(Error);
    });
});
