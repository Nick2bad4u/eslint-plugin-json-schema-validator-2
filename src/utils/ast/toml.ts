import type { ValueOf } from "type-fest";

import { getStaticTOMLValue, type AST as TOML } from "toml-eslint-parser";
import {
    arrayFirst,
    arrayJoin,
    assertNever,
    isEmpty,
    isPresent,
    safeCastTo,
    setHas,
} from "ts-extras";

import type { NodeData } from "./common.js";

const MatchType = {
    beginsMatch: "beginsMatch",
    match: "match",
    notMatch: "notMatch",
    subMatch: "subMatch",
} as const;

type MatchType = ValueOf<typeof MatchType>;

interface TomlNodeGetters {
    TOMLArray: (
        node: TOML.TOMLArray,
        paths: string[]
    ) => NodeData<TOML.TOMLNode>;
    TOMLInlineTable: (
        node: TOML.TOMLInlineTable,
        paths: string[]
    ) => NodeData<TOML.TOMLNode>;
}
type TraverseTarget = TOML.TOMLArray | TOML.TOMLInlineTable;

const TRAVERSE_TARGET_TYPE: ReadonlySet<TOML.TOMLNode["type"]> = new Set<
    TOML.TOMLNode["type"]
>(safeCastTo<TraverseTarget["type"][]>(["TOMLArray", "TOMLInlineTable"]));

const GET_TOML_NODES: TomlNodeGetters = {
    TOMLArray(node: TOML.TOMLArray, paths: string[]) {
        const path = String(paths.shift());
        for (const [index, element] of node.elements.entries()) {
            if (String(index) === path) {
                return { value: element };
            }
        }
        throw new Error(
            `Unexpected state: [${arrayJoin([path, ...paths], ", ")}]`
        );
    },
    TOMLInlineTable(node: TOML.TOMLInlineTable, paths: string[]) {
        for (const body of node.body) {
            const keys = getStaticTOMLValue(body.key);
            const m = getMatchType(paths, keys);
            if (m === MatchType.match) {
                paths.length = 0; // Consume all
                return { value: body.key };
            }
            if (m === MatchType.subMatch) {
                paths.length = 0; // Consume all
                return { value: body.key };
            }
            if (m === MatchType.beginsMatch) {
                paths.splice(0, keys.length);
                return { key: () => body.key.range, value: body.value };
            }
        }
        throw new Error(`Unexpected state: [${arrayJoin(paths, ", ")}]`);
    },
};

/**
 * Get node from path.
 *
 * @throws When a path segment cannot be resolved in the parsed TOML AST.
 */
export function getTOMLNodeFromPath(
    node: TOML.TOMLProgram,
    paths: string[]
): NodeData<TOML.TOMLNode> {
    const remainingPaths = [...paths];
    const topLevelTable = getTopLevelTable(node);
    if (isEmpty(remainingPaths)) {
        return {
            key: (sourceCode): [number, number] =>
                getRequiredRange(sourceCode.getFirstToken(topLevelTable)),
            value: topLevelTable,
        };
    }

    for (const body of topLevelTable.body) {
        if (body.type === "TOMLKeyValue") {
            const result = getTOMLNodeFromPathForKeyValue(body, remainingPaths);
            if (result) {
                return result;
            }
        } else {
            const result = getTOMLNodeFromPathForTable(body, remainingPaths);
            if (result) {
                return result;
            }
        }
    }
    throw new Error(`Unexpected state: [${arrayJoin(remainingPaths, ", ")}]`);
}

/**
 * Checks if the given key is a prefix match.
 */
function getMatchType(paths: string[], keys: (number | string)[]): MatchType {
    if (keys.length <= paths.length) {
        if (!keys.every((key, index) => String(key) === String(paths[index]))) {
            return MatchType.notMatch;
        }
        return keys.length === paths.length
            ? MatchType.match
            : MatchType.beginsMatch;
    }

    return paths.every((path, index) => path === String(keys[index]))
        ? MatchType.subMatch
        : MatchType.notMatch;
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
        throw new Error("Unexpected state: missing TOML token range");
    }
    return token.range;
}

/**
 * Get node from path for content node.
 *
 * @throws When a path segment cannot be resolved in the parsed TOML AST.
 */
function getTOMLNodeFromPathForContent(
    node: TOML.TOMLContentNode,
    paths: string[]
): NodeData<TOML.TOMLNode> {
    const remainingPaths = [...paths];
    let data: NodeData<TOML.TOMLNode> = {
        value: node,
    };
    while (remainingPaths.length > 0 && data.value) {
        if (!isTraverseTarget(data.value)) {
            throw new Error(`Unexpected node type: ${data.value.type}`);
        }
        data = getTOMLNodeFromTraverseTarget(data.value, remainingPaths);
    }
    return data;
}

/**
 * Get node from path for KeyValue node
 */
function getTOMLNodeFromPathForKeyValue(
    node: TOML.TOMLKeyValue,
    paths: string[]
): NodeData<TOML.TOMLNode> | null {
    const keys = getStaticTOMLValue(node.key);
    const m = getMatchType(paths, keys);
    if (m === MatchType.match) {
        return { value: node.key };
    }
    if (m === MatchType.subMatch) {
        return { value: node.key };
    }
    if (m === MatchType.beginsMatch) {
        const nextKeys = paths.slice(keys.length);
        return getTOMLNodeFromPathForContent(node.value, nextKeys);
    }
    return null;
}

/**
 * Gets node data from a TOML traverse target.
 *
 * @throws When called with an unsupported parser node.
 */

/**
 * Gets node data from a TOML table.
 */
function getTOMLNodeFromPathForTable(
    node: TOML.TOMLTable,
    paths: string[]
): NodeData<TOML.TOMLNode> | null {
    const matchType = getMatchType(paths, node.resolvedKey);
    if (matchType === MatchType.match || matchType === MatchType.subMatch) {
        return { value: node.key };
    }
    if (matchType !== MatchType.beginsMatch) {
        return null;
    }

    const nextKeys = paths.slice(node.resolvedKey.length);
    for (const keyVal of node.body) {
        const result = getTOMLNodeFromPathForKeyValue(keyVal, nextKeys);
        if (result) {
            return result;
        }
    }
    return null;
}

function getTOMLNodeFromTraverseTarget(
    node: TraverseTarget,
    paths: string[]
): NodeData<TOML.TOMLNode> {
    switch (node.type) {
        case "TOMLArray": {
            const getTomlArrayNode = GET_TOML_NODES.TOMLArray;
            return getTomlArrayNode(node, paths);
        }
        case "TOMLInlineTable": {
            const getTomlInlineTableNode = GET_TOML_NODES.TOMLInlineTable;
            return getTomlInlineTableNode(node, paths);
        }
        default: {
            return assertNever(node);
        }
    }
}

/**
 * Gets the top-level TOML table.
 */
function getTopLevelTable(node: TOML.TOMLProgram): TOML.TOMLTopLevelTable {
    return arrayFirst(node.body);
}

/**
 * Checks whether given node is traverse target.
 */
function isTraverseTarget(node: TOML.TOMLNode): node is TraverseTarget {
    return setHas(TRAVERSE_TARGET_TYPE, node.type);
}
