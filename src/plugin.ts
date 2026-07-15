import type { ESLint, Linter } from "eslint";

import baseConfig from "./configs/flat/base.js";
import frontmatterConfig from "./configs/flat/frontmatter.js";
import recommendedConfig from "./configs/flat/recommended.js";
import { pluginCore } from "./plugin-core.js";

/**
 * Names of the flat configs exported by the plugin.
 */
export type JsonSchemaValidatorConfigName =
    | "base"
    | "flat/base"
    | "flat/frontmatter"
    | "flat/recommended"
    | "frontmatter"
    | "recommended";

/** Complete plugin object exported by this package. */
export type JsonSchemaValidatorPlugin = ESLint.Plugin & {
    configs: {
        [configName: string]: Linter.Config[];
        base: Linter.Config[];
        "flat/base": Linter.Config[];
        "flat/frontmatter": Linter.Config[];
        "flat/recommended": Linter.Config[];
        frontmatter: Linter.Config[];
        recommended: Linter.Config[];
    };
    meta: {
        name: string;
        namespace: "json-schema-validator-2";
        version: string;
    };
    processors: {
        frontmatter: Linter.Processor;
    };
    rules: Record<
        JsonSchemaValidatorRuleName,
        NonNullable<ESLint.Plugin["rules"]>[string]
    >;
};

/**
 * Fully-qualified rule IDs exported by the plugin.
 */
export type JsonSchemaValidatorRuleId =
    `json-schema-validator-2/${JsonSchemaValidatorRuleName}`;

/**
 * Short rule names exported by the plugin.
 */
export type JsonSchemaValidatorRuleName = "no-invalid";

/** Flat configs exposed through the plugin object. */
const configs: JsonSchemaValidatorPlugin["configs"] = {
    base: baseConfig,
    "flat/base": baseConfig,
    "flat/frontmatter": frontmatterConfig,
    "flat/recommended": recommendedConfig,
    frontmatter: frontmatterConfig,
    recommended: recommendedConfig,
};

/** ESLint plugin object. */
const plugin: JsonSchemaValidatorPlugin = {
    configs,
    meta: pluginCore.meta,
    processors: pluginCore.processors,
    rules: pluginCore.rules,
} satisfies ESLint.Plugin;

/** Plugin package metadata exposed for ESLint. */
export const meta: JsonSchemaValidatorPlugin["meta"] = plugin.meta;

/** Rule registry exposed through the plugin object. */
export const rules: JsonSchemaValidatorPlugin["rules"] = plugin.rules;
export { configs };
export default plugin;
