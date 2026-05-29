import { safeCastTo } from "ts-extras";
import { describe, expect, it } from "vitest";
import {
    getStaticYAMLValue,
    parseForESLint,
    type AST as YAML,
} from "yaml-eslint-parser";

import { getYAMLNodeFromPath } from "../../../../src/utils/ast/yaml";

function parseYaml(code: string) {
    return parseForESLint(code, {
        defaultYAMLVersion: "1.2",
    }).ast;
}

describe("yaml AST path lookup", () => {
    it("selects a document by index when a YAML stream has multiple documents", () => {
        expect.assertions(2);

        const ast = parseYaml(
            [
                "---",
                "a: 1",
                "---",
                "b: 2",
            ].join("\n")
        );
        const nodeData = getYAMLNodeFromPath(ast, ["1", "b"]);

        expect(nodeData.value?.type).toBe("YAMLScalar");

        expect(getStaticYAMLValue(nodeData.value as YAML.YAMLContent)).toBe(2);
    });

    it("throws when a YAML stream document index does not exist", () => {
        expect.assertions(1);

        const ast = parseYaml(
            [
                "---",
                "a: 1",
                "---",
                "b: 2",
            ].join("\n")
        );

        expect(() => getYAMLNodeFromPath(ast, ["2"])).toThrow(
            "Unexpected state: [2]"
        );
    });

    it("throws when traversing an empty YAML program", () => {
        expect.assertions(1);

        const ast = safeCastTo<YAML.YAMLProgram>({
            body: [],
            comments: [],
            loc: {
                end: { column: 0, line: 1 },
                start: { column: 0, line: 1 },
            },
            parent: null,
            range: [0, 0],
            sourceType: "module",
            tokens: [],
            type: "Program",
        });

        expect(() => getYAMLNodeFromPath(ast, ["0"])).toThrow(
            "Unexpected state: empty YAML program"
        );
    });

    it("returns a null value for an empty YAML document", () => {
        expect.assertions(1);

        const ast = parseYaml("# comment only\n");

        expect(getYAMLNodeFromPath(ast, ["missing"]).value).toBeNull();
    });

    it("throws when traversing beyond a scalar YAML value", () => {
        expect.assertions(1);

        const ast = parseYaml("a: 1\n");

        expect(() => getYAMLNodeFromPath(ast, ["a", "nested"])).toThrow(
            "Unexpected node type: YAMLScalar"
        );
    });
});
