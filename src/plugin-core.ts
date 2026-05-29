import type { ESLint, Linter } from "eslint";

import type { RuleModule } from "./types.js";

import * as packageMeta from "./meta.js";
import { frontmatterProcessor } from "./processors/frontmatter.js";
import noInvalidRule from "./rules/no-invalid.js";

/** ESLint plugin namespace used for flat config plugin registration. */
const PLUGIN_NAMESPACE = "json-schema-validator-2" as const;

type JsonSchemaValidatorProcessorName = "frontmatter";
type JsonSchemaValidatorRuleName = "no-invalid";

type PluginCore = ESLint.Plugin & {
    meta: {
        name: string;
        namespace: typeof PLUGIN_NAMESPACE;
        version: string;
    };
    processors: Record<JsonSchemaValidatorProcessorName, Linter.Processor>;
    rules: Record<JsonSchemaValidatorRuleName, RuleModule>;
};

/** Rule registry exposed through the plugin object. */
const rules: Record<JsonSchemaValidatorRuleName, RuleModule> = {
    "no-invalid": noInvalidRule,
};

/** Plugin package metadata exposed for ESLint. */
const meta = {
    name: packageMeta.name,
    namespace: PLUGIN_NAMESPACE,
    version: packageMeta.version,
};

/** Processor registry exposed through the plugin object. */
const processors: Record<JsonSchemaValidatorProcessorName, Linter.Processor> = {
    frontmatter: frontmatterProcessor,
};

/**
 * Config-free plugin object used by flat configs.
 *
 * Keeping configs out of this object prevents plugin to config to plugin import
 * cycles while still registering the same rules and metadata.
 */
export const pluginCore: PluginCore = {
    meta,
    processors,
    rules,
};
