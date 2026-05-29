import type { AST as YAML } from "yaml-eslint-parser";

import {
    arrayFirst,
    arrayJoin,
    isPresent,
    safeCastTo,
    setHas,
} from "ts-extras";
import { getStaticYAMLValue } from "yaml-eslint-parser";

import type { Token } from "../../types.ts";
import type { GetNodeFromPath, NodeData } from "./common.ts";

type TraverseTarget =
    | YAML.YAMLAlias
    | YAML.YAMLDocument
    | YAML.YAMLMapping
    | YAML.YAMLProgram
    | YAML.YAMLSequence
    | YAML.YAMLWithMeta;

const TRAVERSE_TARGET_TYPE = new Set<string>(
    safeCastTo<TraverseTarget["type"][]>([
        "Program",
        "YAMLAlias",
        "YAMLDocument",
        "YAMLMapping",
        "YAMLSequence",
        "YAMLWithMeta",
    ])
);

const GET_YAML_NODES: Record<
    TraverseTarget["type"],
    GetNodeFromPath<YAML.YAMLNode>
> = {
    Program(node: YAML.YAMLProgram, paths: string[]) {
        if (node.body.length <= 1) {
            const document = arrayFirst(node.body);
            if (document) {
                return { value: document };
            }
            throw new Error("Unexpected state: empty YAML program");
        }
        const path = String(paths.shift());
        for (let index = 0; index < node.body.length; index++) {
            if (String(index) !== path) {
                continue;
            }
            const document = node.body[index];
            if (document) {
                return { value: document };
            }
            break;
        }
        throw new Error(
            `Unexpected state: [${arrayJoin([path, ...paths], ", ")}]`
        );
    },
    YAMLAlias(node: YAML.YAMLAlias, paths: string[]) {
        paths.length = 0; // Consume all
        return { value: node };
    },
    YAMLDocument(node: YAML.YAMLDocument, _paths: string[]) {
        if (node.content) {
            return { value: node.content };
        }
        return {
            key: () => node.range,
            value: null,
        };
    },
    YAMLMapping(node: YAML.YAMLMapping, paths: string[]) {
        const path = String(paths.shift());
        for (const pair of node.pairs) {
            const key = String(pair.key ? getStaticYAMLValue(pair.key) : null);

            if (key === path) {
                return {
                    key: (sourceCode) => {
                        if (pair.key) {
                            return pair.key.range;
                        }
                        return sourceCode.getFirstToken(pair).range!;
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
        const path = String(paths.shift());
        for (let index = 0; index < node.entries.length; index++) {
            if (String(index) !== path) {
                continue;
            }
            const entry = node.entries[index];

            if (entry) {
                return { value: entry };
            }
            return {
                key: (sourceCode) => {
                    const before = node.entries
                        .slice(0, index)
                        .reverse()
                        .find((n) => isPresent(n));
                    let hyphenTokenElementIndex: number;
                    let hyphenToken: Token;
                    if (before) {
                        hyphenTokenElementIndex =
                            node.entries.indexOf(before) + 1;
                        hyphenToken = sourceCode.getTokenAfter(before)!;
                    } else {
                        hyphenTokenElementIndex = 0;
                        hyphenToken = sourceCode.getFirstToken(node);
                    }
                    // If it is preceded by consecutive blank elements, it must be moved to the target.
                    while (hyphenTokenElementIndex < index) {
                        hyphenTokenElementIndex++;
                        hyphenToken = sourceCode.getTokenAfter(hyphenToken)!;
                    }
                    return hyphenToken.range!;
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
 * Get node from path
 */
export function getYAMLNodeFromPath(
    node: YAML.YAMLProgram,
    [...paths]: string[]
): NodeData<YAML.YAMLNode> {
    let data: NodeData<YAML.YAMLNode> = {
        key: (sourceCode) => {
            const doc = arrayFirst(node.body);
            if (!doc) {
                return (sourceCode.getFirstToken(node) || node).range!;
            }
            if (node.body.length > 1) {
                return (sourceCode.getFirstToken(doc) || doc).range!;
            }
            const dataNode = doc.content;
            if (dataNode == null) {
                return (sourceCode.getFirstToken(doc) || doc).range!;
            }
            if (
                dataNode.type === "YAMLMapping" ||
                dataNode.type === "YAMLSequence"
            ) {
                return sourceCode.getFirstToken(dataNode).range!;
            }
            return dataNode.range;
        },
        value: node,
    };
    while (paths.length > 0 && data.value) {
        if (!isTraverseTarget(data.value)) {
            throw new Error(`Unexpected node type: ${data.value.type}`);
        }
        data = GET_YAML_NODES[data.value.type](data.value as never, paths);
    }
    return data;
}

/**
 * Checks whether given node is traverse target.
 */
function isTraverseTarget(node: YAML.YAMLNode): node is TraverseTarget {
    return setHas(TRAVERSE_TARGET_TYPE, node.type);
}
