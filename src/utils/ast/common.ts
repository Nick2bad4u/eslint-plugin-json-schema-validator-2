import type { SourceCode } from "../../types.js";

/**
 * Lazily resolves a node location tuple from ESLint source code.
 */
export type GetLoc = (sourceCode: SourceCode) => [number, number];

/**
 * Parser-specific node metadata used to report schema validation errors.
 */
export type NodeData<N> =
    | { key: GetLoc; value: N | null }
    | { key?: undefined; value: N };
