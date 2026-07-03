import {
    arrayFirst,
    arrayJoin,
    assertNever,
    isPresent,
    safeCastTo,
    setHas,
} from "ts-extras";
import { getStaticYAMLValue, type AST as YAML } from "yaml-eslint-parser";

import type { Token } from "../../types.js";
import type { NodeData } from "./common.js";

type TraverseTarget =
    | YAML.YAMLAlias
    | YAML.YAMLDocument
    | YAML.YAMLMapping
    | YAML.YAMLProgram
    | YAML.YAMLSequence
    | YAML.YAMLWithMeta;
interface YamlNodeGetters {
    Program: (
        node: YAML.YAMLProgram,
        paths: string[]
    ) => NodeData<YAML.YAMLNode>;
    YAMLAlias: (
        node: YAML.YAMLAlias,
        paths: string[]
    ) => NodeData<YAML.YAMLNode>;
    YAMLDocument: (
        node: YAML.YAMLDocument,
        paths: string[]
    ) => NodeData<YAML.YAMLNode>;
    YAMLMapping: (
        node: YAML.YAMLMapping,
        paths: string[]
    ) => NodeData<YAML.YAMLNode>;
    YAMLSequence: (
        node: YAML.YAMLSequence,
        paths: string[]
    ) => NodeData<YAML.YAMLNode>;
    YAMLWithMeta: (
        node: YAML.YAMLWithMeta,
        paths: string[]
    ) => NodeData<YAML.YAMLNode>;
}

const TRAVERSE_TARGET_TYPE: ReadonlySet<YAML.YAMLNode["type"]> = new Set<
    YAML.YAMLNode["type"]
>(
    safeCastTo<TraverseTarget["type"][]>([
        "Program",
        "YAMLAlias",
        "YAMLDocument",
        "YAMLMapping",
        "YAMLSequence",
        "YAMLWithMeta",
    ])
);

const GET_YAML_NODES: YamlNodeGetters = {
    Program(node: YAML.YAMLProgram, paths: string[]) {
        if (node.body.length <= 1) {
            const document = arrayFirst(node.body);
            if (document) {
                return { value: document };
            }
            throw new Error("Unexpected state: empty YAML program");
        }
        const path = consumePath(paths);
        for (const [index, document] of node.body.entries()) {
            if (String(index) === path) {
                return { value: document };
            }
        }
        throw new Error(
            `Unexpected state: [${arrayJoin([path, ...paths], ", ")}]`
        );
    },
    YAMLAlias(node: YAML.YAMLAlias, paths: string[]) {
        paths.length = 0; // Consume all
        return { value: node };
    },
    YAMLDocument(node: YAML.YAMLDocument) {
        if (node.content) {
            return { value: node.content };
        }
        return {
            key: (): [number, number] => getRequiredRange(node),
            value: null,
        };
    },
    YAMLMapping(node: YAML.YAMLMapping, paths: string[]) {
        const path = consumePath(paths);
        for (const pair of node.pairs) {
            const key = getYAMLPathKey(pair.key);

            if (key === path) {
                return {
                    key: (sourceCode): [number, number] => {
                        if (pair.key) {
                            return pair.key.range;
                        }
                        return getRequiredRange(sourceCode.getFirstToken(pair));
                    },
                    value: pair.value,
                };
            }
        }
        throw new Error(
            `Unexpected state: [${arrayJoin([path, ...paths], ", ")}]`
        );
    },
    YAMLSequence(node: YAML.YAMLSequence, paths: string[]) {
        const path = consumePath(paths);
        for (const [index, entry] of node.entries.entries()) {
            if (String(index) !== path) {
                continue;
            }

            if (entry) {
                return { value: entry };
            }
            return {
                key: (sourceCode): [number, number] => {
                    const before = node.entries
                        .slice(0, index)
                        .toReversed()
                        .find((n) => isPresent(n));
                    let hyphenTokenElementIndex: number;
                    let hyphenToken: null | Token;
                    if (before) {
                        hyphenTokenElementIndex =
                            node.entries.indexOf(before) + 1;
                        hyphenToken = sourceCode.getTokenAfter(before);
                    } else {
                        hyphenTokenElementIndex = 0;
                        hyphenToken = sourceCode.getFirstToken(node);
                    }
                    // If it is preceded by consecutive blank elements, it must be moved to the target.
                    while (hyphenTokenElementIndex < index) {
                        hyphenTokenElementIndex += 1;
                        hyphenToken = sourceCode.getTokenAfter(
                            getRequiredToken(hyphenToken)
                        );
                    }
                    return getRequiredRange(getRequiredToken(hyphenToken));
                },
                value: null,
            };
        }
        throw new Error(
            `Unexpected state: [${arrayJoin([path, ...paths], ", ")}]`
        );
    },
    YAMLWithMeta(node: YAML.YAMLWithMeta, paths: string[]) {
        if (node.value) {
            return { value: node.value };
        }
        throw new Error(`Unexpected state: [${arrayJoin(paths, ", ")}]`);
    },
};

/**
 * Get node from path.
 *
 * @throws When a path segment cannot be resolved in the parsed YAML AST.
 */
export function getYAMLNodeFromPath(
    node: YAML.YAMLProgram,
    paths: string[]
): NodeData<YAML.YAMLNode> {
    const remainingPaths = [...paths];
    let data: NodeData<YAML.YAMLNode> = {
        key: (sourceCode): [number, number] => {
            const doc = arrayFirst(node.body);
            if (!doc) {
                return getNodeRange(sourceCode.getFirstToken(node), node);
            }
            if (node.body.length > 1) {
                return getNodeRange(sourceCode.getFirstToken(doc), doc);
            }
            const dataNode = doc.content;
            if (!isPresent(dataNode)) {
                return getNodeRange(sourceCode.getFirstToken(doc), doc);
            }
            if (
                dataNode.type === "YAMLMapping" ||
                dataNode.type === "YAMLSequence"
            ) {
                return getNodeRange(
                    sourceCode.getFirstToken(dataNode),
                    dataNode
                );
            }
            return dataNode.range;
        },
        value: node,
    };
    while (remainingPaths.length > 0 && data.value) {
        if (!isTraverseTarget(data.value)) {
            throw new Error(`Unexpected node type: ${data.value.type}`);
        }
        data = getYAMLNodeFromTraverseTarget(data.value, remainingPaths);
    }
    return data;
}

function consumePath(paths: string[]): string {
    const [pathValue, ...remainingPaths] = paths;
    paths.length = 0;
    paths.push(...remainingPaths);
    return String(pathValue);
}

/**
 * Gets the first token range when present, otherwise falls back to the parser
 * node range. Empty YAML documents can contain comments without tokens.
 */
function getNodeRange(
    token: null | { range?: [number, number] | undefined },
    node: { range?: [number, number] | undefined }
): [number, number] {
    if (isPresent(token?.range)) {
        return token.range;
    }
    return getRequiredRange(node);
}

/**
 * Gets a concrete source range or throws for malformed parser token stores.
 *
 * @throws When a parser token lacks a source range.
 */
function getRequiredRange(token: {
    range?: [number, number] | undefined;
}): [number, number] {
    if (!isPresent(token.range)) {
        throw new Error("Unexpected state: missing YAML token range");
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
        throw new Error("Unexpected state: missing YAML token");
    }
    return token;
}

/**
 * Gets node data from a YAML traverse target.
 *
 * @throws When called with an unsupported parser node.
 */
/* eslint-disable new-cap -- Parser dispatch uses ESTree-style uppercase node-type property names. */
function getYAMLNodeFromTraverseTarget(
    node: TraverseTarget,
    paths: string[]
): NodeData<YAML.YAMLNode> {
    switch (node.type) {
        case "Program": {
            return GET_YAML_NODES.Program(node, paths);
        }
        case "YAMLAlias": {
            return GET_YAML_NODES.YAMLAlias(node, paths);
        }
        case "YAMLDocument": {
            return GET_YAML_NODES.YAMLDocument(node, paths);
        }
        case "YAMLMapping": {
            return GET_YAML_NODES.YAMLMapping(node, paths);
        }
        case "YAMLSequence": {
            return GET_YAML_NODES.YAMLSequence(node, paths);
        }
        case "YAMLWithMeta": {
            return GET_YAML_NODES.YAMLWithMeta(node, paths);
        }
        default: {
            return assertNever(node);
        }
    }
}
/* eslint-enable new-cap -- Re-enable after parser node dispatch. */

/**
 * Converts scalar YAML keys to path keys.
 */
function getYAMLPathKey(
    node: null | YAML.YAMLContent | YAML.YAMLWithMeta
): null | string {
    if (!isPresent(node)) {
        return "null";
    }
    const value = getStaticYAMLValue(node);
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "boolean" || typeof value === "number") {
        return String(value);
    }
    return value === null ? "null" : null;
}

/**
 * Checks whether given node is traverse target.
 */
function isTraverseTarget(node: YAML.YAMLNode): node is TraverseTarget {
    return setHas(TRAVERSE_TARGET_TYPE, node.type);
}
