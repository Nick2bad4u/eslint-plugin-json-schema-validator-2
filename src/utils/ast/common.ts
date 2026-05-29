import type { SourceCode } from "../../types.ts";

export type GetLoc = (sourceCode: SourceCode) => [number, number];
export type GetNodeFromPath<N> = (node: never, paths: string[]) => NodeData<N>;
export type NodeData<N> =
  | { key: GetLoc; value: N | null }
  | { key?: undefined; value: N };
