import type { RuleDefinition } from "@eslint/core";
import type { ESLint, Linter } from "eslint";

import type { RuleModule } from "./types.ts";

import baseConfig from "./configs/flat/base.ts";
import recommendedConfig from "./configs/flat/recommended.ts";
import * as packageMeta from "./meta.ts";
import { rules as ruleList } from "./utils/rules.ts";

const PLUGIN_NAMESPACE = "json-schema-validator-2" as const;

export type JsonSchemaValidatorConfigName =
  | "base"
  | "flat/base"
  | "flat/recommended"
  | "recommended";

export type JsonSchemaValidatorRuleId =
  `${typeof PLUGIN_NAMESPACE}/${JsonSchemaValidatorRuleName}`;

export type JsonSchemaValidatorRuleName = "no-invalid";

type JsonSchemaValidatorConfigs = Record<
  JsonSchemaValidatorConfigName,
  Linter.Config[]
>;

type JsonSchemaValidatorPlugin = ESLint.Plugin & {
  configs: JsonSchemaValidatorConfigs;
  meta: {
    name: string;
    namespace: typeof PLUGIN_NAMESPACE;
    version: string;
  };
  rules: Record<JsonSchemaValidatorRuleName, RuleDefinition>;
};

const configs: JsonSchemaValidatorConfigs = {
  base: baseConfig,
  "flat/base": baseConfig,
  "flat/recommended": recommendedConfig,
  recommended: recommendedConfig,
};

const rules = ruleList.reduce<Record<JsonSchemaValidatorRuleName, RuleModule>>(
  (registry, rule) => {
    registry[rule.meta.docs.ruleName as JsonSchemaValidatorRuleName] = rule;

    return registry;
  },
  {} as Record<JsonSchemaValidatorRuleName, RuleModule>,
) as Record<JsonSchemaValidatorRuleName, RuleDefinition>;

const plugin: JsonSchemaValidatorPlugin = {
  configs,
  meta: {
    name: packageMeta.name,
    namespace: PLUGIN_NAMESPACE,
    version: packageMeta.version,
  },
  processors: {},
  rules,
};

export const meta: JsonSchemaValidatorPlugin["meta"] = plugin.meta;
export { configs, rules };
export default plugin;
