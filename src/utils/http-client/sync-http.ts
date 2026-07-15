import type { RequestOptions } from "node:https";

import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSyncFn } from "synckit";
import { safeCastTo } from "ts-extras";

const moduleUrl =
    typeof import.meta.url === "string"
        ? import.meta.url
        : pathToFileURL(__filename).href;
const moduleFilename = fileURLToPath(moduleUrl);
const require = createRequire(moduleUrl);
const ext = path.extname(moduleFilename);
const sourceRuntimeWorkerPath = fileURLToPath(
    new URL("../../../dist/utils/http-client/worker.js", moduleUrl)
);

const resolveIfAvailable = (workerPath: string): null | string => {
    try {
        return require.resolve(workerPath);
    } catch {
        return null;
    }
};

const resolveWorkerPath = (): string => {
    if ((ext === ".ts" || ext === ".mts") && sourceRuntimeWorkerPath !== "") {
        const builtWorkerPath = resolveIfAvailable(sourceRuntimeWorkerPath);

        if (builtWorkerPath !== null) {
            return builtWorkerPath;
        }
    }

    const sameDirectoryWorkerPath = fileURLToPath(
        new URL(`worker${ext}`, moduleUrl)
    );
    const sameDirectoryWorker = resolveIfAvailable(sameDirectoryWorkerPath);

    if (sameDirectoryWorker !== null) {
        return sameDirectoryWorker;
    }

    return require.resolve(
        fileURLToPath(new URL(`utils/http-client/worker${ext}`, moduleUrl))
    );
};

const getSync = safeCastTo<
    (url: string, options?: RequestOptions, httpModulePath?: string) => string
>(createSyncFn(resolveWorkerPath()));

/**
 * Synchronously GET Method
 */
export function syncGet(
    url: string,
    options?: RequestOptions,
    httpModulePath?: string
): string {
    // eslint-disable-next-line n/no-sync -- synckit intentionally exposes sync schema loading to ESLint rules
    return getSync(url, options, httpModulePath);
}
