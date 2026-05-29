import assert from "node:assert";
import { describe, it } from "vitest";

import pkg from "../../package.json" with { type: "json" };
import plugin from "../../src/index.ts";

const { version } = pkg;
const expectedMeta = {
  name: "eslint-plugin-json-schema-validator-2",
  namespace: "json-schema-validator-2",
  version,
};

describe("test for meta object", () => {
  it("a plugin should have a meta object.", () => {
    assert.strictEqual(plugin.meta.name, expectedMeta.name);
    assert.strictEqual(plugin.meta.namespace, expectedMeta.namespace);
    assert.strictEqual(plugin.meta.version, expectedMeta.version);
  });
});
