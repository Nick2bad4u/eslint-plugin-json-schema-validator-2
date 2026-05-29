import type { RequestOptions } from "node:https";

/** Custom async HTTP GET module loaded from plugin settings. */
export type GetModule = (
    url: string,
    options?: RequestOptions
) => Promise<string>;
