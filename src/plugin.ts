import type { ESLint, Linter } from "eslint";

import baseConfig from "./configs/flat/base.js";
import recommendedConfig from "./configs/flat/recommended.js";
import { pluginCore } from "./plugin-core.js";

/** Names of the flat configs exported by the plugin. */
export type JsonSchemaValidatorConfigName =
    | "base"
    | "flat/base"
    | "flat/recommended"
    | "recommended";

/** Fully-qualified rule IDs exported by the plugin. */
export type JsonSchemaValidatorRuleId =
    `json-schema-validator-2/${JsonSchemaValidatorRuleName}`;

/** Short rule names exported by the plugin. */
export type JsonSchemaValidatorRuleName = "no-invalid";

type JsonSchemaValidatorConfigs = Record<
    JsonSchemaValidatorConfigName,
    Linter.Config[]
>;

type JsonSchemaValidatorPlugin = ESLint.Plugin & {
    configs: JsonSchemaValidatorConfigs;
    meta: typeof pluginCore.meta;
    rules: typeof pluginCore.rules;
};

/** Flat configs exposed through the plugin object. */
const configs: JsonSchemaValidatorConfigs = {
    base: baseConfig,
    "flat/base": baseConfig,
    "flat/recommended": recommendedConfig,
    recommended: recommendedConfig,
};

/** ESLint plugin object. */
const plugin: JsonSchemaValidatorPlugin = {
    ...pluginCore,
    configs,
};

/** Plugin package metadata exposed for ESLint. */
export const meta: JsonSchemaValidatorPlugin["meta"] = plugin.meta;

/** Rule registry exposed through the plugin object. */
export const rules: JsonSchemaValidatorPlugin["rules"] = plugin.rules;
export { configs };
export default plugin;
