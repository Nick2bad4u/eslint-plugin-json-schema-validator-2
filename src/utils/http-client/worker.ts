import type { RequestOptions } from "node:https";

import { runAsWorker } from "synckit";

import { get } from "./http.ts";

runAsWorker(
  async (url: string, options?: RequestOptions, httpModulePath?: string) => get(url, options, httpModulePath),
);
