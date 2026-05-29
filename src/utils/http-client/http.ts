import type { RequestOptions } from "node:https";

import { createRequire } from "node:module";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

import defaultClient from "./get-modules/http.ts";

/**
 * GET Method
 */
export async function get(
  url: string,
  options?: RequestOptions,
  httpModulePath?: string,
): Promise<string> {
  const client = httpModulePath
    ? await loadModule(httpModulePath)
    : defaultClient;
  return client.default ? client.default(url, options) : client(url, options);
}

/**
 * Load module by path
 */
async function loadModule(modulePath: string) {
  const adjustedPath =
    !modulePath.startsWith("file://") && isAbsolute(modulePath)
      ? pathToFileURL(modulePath).href
      : modulePath;
  try {
    const require = createRequire(import.meta.url);
    return require(adjustedPath);
  } catch {
    return await import(adjustedPath);
  }
}
