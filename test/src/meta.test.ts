import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import plugin from "../../src/plugin";

const packageJson = JSON.parse(
    fs.readFileSync(
        fileURLToPath(new URL("../../package.json", import.meta.url))
    ) as unknown as string
) as { version: string };

const expectedMeta = {
    name: "eslint-plugin-json-schema-validator-2",
    namespace: "json-schema-validator-2",
    version: packageJson.version,
};

describe("test for meta object", () => {
    it("a plugin should have a meta object.", () => {
        expect.assertions(4);

        expect(plugin.meta.name).toBe(expectedMeta.name);
        expect(plugin.meta.namespace).toBe(expectedMeta.namespace);
        expect(plugin.meta.version).toBe(expectedMeta.version);
        expect(plugin.meta.name).not.toBe(
            "eslint-plugin-json-schema-validator"
        );
    });
});
