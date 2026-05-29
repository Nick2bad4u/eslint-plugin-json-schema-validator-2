import type { RequestOptions } from "node:https";

import { createRequire } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { isDefined, objectHasOwn } from "ts-extras";

import type { GetModule } from "./get-module.js";

import defaultClient from "./get-modules/http.js";

type GetModuleExport = GetModule | { default: GetModule };

/**
 * GET Method
 */
export async function get(
    url: string,
    options?: RequestOptions,
    httpModulePath?: string
): Promise<string> {
    const client =
        isDefined(httpModulePath) && httpModulePath !== ""
            ? getDefaultExport(await loadModule(httpModulePath))
            : defaultClient;
    return client(url, options);
}

function getDefaultExport(moduleExport: GetModuleExport): GetModule {
    return typeof moduleExport === "function"
        ? moduleExport
        : moduleExport.default;
}

function isGetModule(value: unknown): value is GetModule {
    return typeof value === "function";
}

/**
 * Load module by path
 */
async function loadModule(modulePath: string): Promise<GetModuleExport> {
    const adjustedPath =
        !modulePath.startsWith("file://") && path.isAbsolute(modulePath)
            ? pathToFileURL(modulePath).href
            : modulePath;
    try {
        const require = createRequire(import.meta.url);
        // eslint-disable-next-line import-x/no-dynamic-require, security/detect-non-literal-require, etc-misc/prefer-const-require -- user settings can point at a custom HTTP module
        return normalizeModule(require(adjustedPath) as unknown);
    } catch {
        // eslint-disable-next-line no-unsanitized/method -- user settings can point at a custom HTTP module
        return normalizeModule(await import(adjustedPath));
    }
}

function normalizeModule(value: unknown): GetModuleExport {
    if (isGetModule(value)) {
        return value;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        objectHasOwn(value, "default") &&
        isGetModule(value.default)
    ) {
        return { default: value.default };
    }

    throw new TypeError("Configured HTTP module must export a GET function.");
}
