import assert from "node:assert";
import { createRequire } from "node:module";
import { describe, it } from "vitest";

import { get, syncGet } from "../../../../src/utils/http-client/index.ts";

const require = createRequire(import.meta.url);

describe("HTTP GET.", () => {
    it("should to receive a request.", async () => {
        const res = await get(
            "https://raw.githubusercontent.com/ota-meshi/eslint-plugin-json-schema-validator/main/package.json"
        );
        assert.deepStrictEqual(
            JSON.parse(res).name,
            "eslint-plugin-json-schema-validator"
        );
    });

    it("should to receive a request with option and sync.", () => {
        const res = syncGet(
            "https://raw.githubusercontent.com/ota-meshi/eslint-plugin-json-schema-validator/main/package.json",
            {},
            require.resolve("./get-modules/request-get.mjs")
        );
        assert.deepStrictEqual(
            JSON.parse(res).name,
            "eslint-plugin-json-schema-validator"
        );
    });

    it("should to receive a request with a redirect.", async () => {
        const res = await get(
            "https://unpkg.com/eslint-plugin-json-schema-validator/package.json"
        );
        assert.deepStrictEqual(
            JSON.parse(res).name,
            "eslint-plugin-json-schema-validator"
        );
    });

    it("should to receive a request with a redirect (2).", async () => {
        const res = await get(
            "https://raw.github.com/ota-meshi/eslint-plugin-json-schema-validator/main/package.json"
        );
        assert.deepStrictEqual(
            JSON.parse(res).name,
            "eslint-plugin-json-schema-validator"
        );
    });
});
