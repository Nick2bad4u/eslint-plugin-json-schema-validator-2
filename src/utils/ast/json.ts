import type { AST as JSON } from "jsonc-eslint-parser";

import {
    arrayFirst,
    arrayJoin,
    assertNever,
    isPresent,
    safeCastTo,
    setHas,
} from "ts-extras";

import type { NodeData } from "./common.js";

interface JsonNodeGetters {
    JSONArrayExpression: (
        node: JSON.JSONArrayExpression,
        paths: string[]
    ) => NodeData<JSON.JSONNode>;
    JSONExpressionStatement: (
        node: JSON.JSONExpressionStatement,
        paths: string[]
    ) => NodeData<JSON.JSONNode>;
    JSONObjectExpression: (
        node: JSON.JSONObjectExpression,
        paths: string[]
    ) => NodeData<JSON.JSONNode>;
    Program: (
        node: JSON.JSONProgram,
        paths: string[]
    ) => NodeData<JSON.JSONNode>;
}
type TraverseTarget =
    | JSON.JSONArrayExpression
    | JSON.JSONExpressionStatement
    | JSON.JSONObjectExpression
    | JSON.JSONProgram;

const TRAVERSE_TARGET_TYPE: ReadonlySet<JSON.JSONNode["type"]> = new Set<
    JSON.JSONNode["type"]
>(
    safeCastTo<TraverseTarget["type"][]>([
        "JSONArrayExpression",
        "JSONExpressionStatement",
        "JSONObjectExpression",
        "Program",
    ])
);

const GET_JSON_NODES: JsonNodeGetters = {
    JSONArrayExpression(node: JSON.JSONArrayExpression, paths: string[]) {
        const path = String(paths.shift());
        for (const [index, element] of node.elements.entries()) {
            if (String(index) === path) {
                if (element) {
                    return { value: element };
                }
                return {
                    key: (sourceCode): [number, number] => {
                        const before = node.elements
                            .slice(0, index)
                            .toReversed()
                            .find((n) => isPresent(n));
                        let tokenIndex = before
                            ? node.elements.indexOf(before)
                            : -1;
                        let token = before
                            ? sourceCode.getTokenAfter(before)
                            : sourceCode.getFirstToken(node);
                        while (tokenIndex < index) {
                            tokenIndex += 1;
                            token = sourceCode.getTokenAfter(
                                getRequiredToken(token)
                            );
                        }
                        const currentToken = getRequiredToken(token);
                        const previousToken = getRequiredToken(
                            sourceCode.getTokenBefore(currentToken)
                        );

                        return [
                            getRequiredRange(previousToken)[1],
                            arrayFirst(getRequiredRange(currentToken)),
                        ];
                    },
                    value: null,
                };
            }
        }
        throw new Error(
            `Unexpected state: [${arrayJoin([path, ...paths], ", ")}]`
        );
    },
    JSONExpressionStatement: (node: JSON.JSONExpressionStatement) => ({
        value: node.expression,
    }),
    JSONObjectExpression(node: JSON.JSONObjectExpression, paths: string[]) {
        const path = String(paths.shift());
        for (const prop of node.properties) {
            if (prop.key.type === "JSONIdentifier") {
                if (prop.key.name === path) {
                    return { key: () => prop.key.range, value: prop.value };
                }
            } else if (String(prop.key.value) === path) {
                return { key: () => prop.key.range, value: prop.value };
            }
        }
        throw new Error(
            `Unexpected state: [${arrayJoin([path, ...paths], ", ")}]`
        );
    },
    Program: (node: JSON.JSONProgram) => ({ value: arrayFirst(node.body) }),
};
/**
 * Get node from path.
 *
 * @throws When a path segment cannot be resolved in the parsed JSON AST.
 */
export function getJSONNodeFromPath(
    node: JSON.JSONProgram,
    paths: string[]
): NodeData<JSON.JSONNode> {
    const remainingPaths = [...paths];
    let data: NodeData<JSON.JSONNode> = {
        key: (sourceCode): [number, number] => {
            const dataNode = arrayFirst(node.body).expression;
            if (
                dataNode.type === "JSONObjectExpression" ||
                dataNode.type === "JSONArrayExpression"
            ) {
                return getRequiredRange(sourceCode.getFirstToken(dataNode));
            }
            return dataNode.range;
        },
        value: node,
    };
    while (remainingPaths.length > 0 && data.value) {
        if (!isTraverseTarget(data.value)) {
            throw new Error(`Unexpected node type: ${data.value.type}`);
        }
        data = getJSONNodeFromTraverseTarget(data.value, remainingPaths);
    }
    return data;
}

/**
 * Gets node data from a JSON traverse target.
 *
 * @throws When called with an unsupported parser node.
 */
/* eslint-disable new-cap -- Parser dispatch uses ESTree-style uppercase node-type property names. */
function getJSONNodeFromTraverseTarget(
    node: TraverseTarget,
    paths: string[]
): NodeData<JSON.JSONNode> {
    switch (node.type) {
        case "JSONArrayExpression": {
            return GET_JSON_NODES.JSONArrayExpression(node, paths);
        }
        case "JSONExpressionStatement": {
            return GET_JSON_NODES.JSONExpressionStatement(node, paths);
        }
        case "JSONObjectExpression": {
            return GET_JSON_NODES.JSONObjectExpression(node, paths);
        }
        case "Program": {
            return GET_JSON_NODES.Program(node, paths);
        }
        default: {
            return assertNever(node);
        }
    }
}
/* eslint-enable new-cap -- Re-enable after parser node dispatch. */

/**
 * Gets a concrete source range or throws for malformed parser token stores.
 *
 * @throws When a parser token lacks a source range.
 */
function getRequiredRange(token: {
    range?: [number, number] | undefined;
}): [number, number] {
    if (!isPresent(token.range)) {
        throw new Error("Unexpected state: missing JSON token range");
    }
    return token.range;
}

/**
 * Gets a token or throws for malformed parser token stores.
 *
 * @throws When the parser token store cannot provide the requested token.
 */
function getRequiredToken<T>(token: null | T): T {
    if (!isPresent(token)) {
        throw new Error("Unexpected state: missing JSON token");
    }
    return token;
}

/**
 * Checks whether given node is traverse target.
 */
function isTraverseTarget(node: JSON.JSONNode): node is TraverseTarget {
    return setHas(TRAVERSE_TARGET_TYPE, node.type);
}
