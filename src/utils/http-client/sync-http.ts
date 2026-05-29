import type { RequestOptions } from "node:https";

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSyncFn } from "synckit";

const require = createRequire(import.meta.url);
const ext = path.extname(import.meta.filename);
const sourceRuntimeWorkerPath = fileURLToPath(
  new URL("../../../dist/utils/http-client/worker.mjs", import.meta.url),
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
    new URL(`./worker${ext}`, import.meta.url),
  );
  const sameDirectoryWorker = resolveIfAvailable(sameDirectoryWorkerPath);

  if (sameDirectoryWorker) {
    return sameDirectoryWorker;
  }

  return require.resolve(
      fileURLToPath(
        new URL(`./utils/http-client/worker${ext}`, import.meta.url),
      ),
  );
};

const getSync = createSyncFn(resolveWorkerPath());

/**
 * Synchronously GET Method
 */
export function syncGet(
  url: string,
  options?: RequestOptions,
  httpModulePath?: string,
): string {
  return getSync(url, options, httpModulePath) as string;
}
