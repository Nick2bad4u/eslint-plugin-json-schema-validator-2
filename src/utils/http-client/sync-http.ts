import type { RequestOptions } from "node:https";

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSyncFn } from "synckit";
import { safeCastTo } from "ts-extras";

const moduleUrl =
    typeof __filename === "string"
        ? pathToFileURL(__filename).href
        : import.meta.url;
const moduleFilename =
    typeof __filename === "string" ? __filename : import.meta.filename;
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
    if (ext === ".ts" || ext === ".mts") {
        const builtWorkerPath = resolveIfAvailable(sourceRuntimeWorkerPath);

        if (builtWorkerPath) {
            return builtWorkerPath;
        }
    }

    const sameDirectoryWorkerPath = fileURLToPath(
        new URL(`./worker${ext}`, moduleUrl)
    );
    const sameDirectoryWorker = resolveIfAvailable(sameDirectoryWorkerPath);

    if (sameDirectoryWorker) {
        return sameDirectoryWorker;
    }

    return require.resolve(
        fileURLToPath(new URL(`./utils/http-client/worker${ext}`, moduleUrl))
    );
};

const getSync = createSyncFn(resolveWorkerPath());

/**
 * Synchronously GET Method
 */
export function syncGet(
    url: string,
    options?: RequestOptions,
    httpModulePath?: string
): string {
    return safeCastTo<string>(getSync(url, options, httpModulePath));
}
