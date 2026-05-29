import nickTwoBadFourU from "eslint-config-nick2bad4u";
import * as jsoncParser from "jsonc-eslint-parser";

import plugin from "./plugin.mjs";

const baseConfig = nickTwoBadFourU.configs.all;

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...baseConfig,

    {
        files: [".devcontainer/devcontainer.json"],
        languageOptions: {
            parser: jsoncParser,
        },
        name: "Local JSONC Devcontainer",
    },
    {
        files: ["docs/docusaurus/src/pages/index.tsx"],
        name: "Local Docusaurus Root Page",
        rules: {
            "canonical/filename-no-index": "off",
        },
    },
    {
        files: ["docs/rules/*.md"],
        name: "Local Docusaurus Rule Documentation Markdown",
        rules: {
            "markdown/no-multiple-h1": "off",
        },
    },
    {
        files: ["docs/docusaurus/docusaurus.config.ts"],
        name: "Local Docusaurus Config Environment",
        rules: {
            "n/no-process-env": "off",
        },
    },
    {
        files: ["docs/docusaurus/**/*.{ts,tsx,mts,cts}"],
        name: "Local Docusaurus Virtual Imports",
        rules: {
            "import-x/no-unresolved": [
                "error",
                {
                    ignore: ["^@docusaurus/", "^@theme/"],
                },
            ],
        },
    },
    {
        files: ["docs/docusaurus/typedoc-plugins/*.mjs"],
        name: "Local TypeDoc Runtime Plugin JavaScript",
        rules: {
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "import-x/extensions": "off",
        },
    },
    {
        files: ["test/src/utils/http-client/get-modules/*.mjs"],
        name: "Local HTTP Client Test Runtime Modules",
        rules: {
            "@typescript-eslint/explicit-module-boundary-types": "off",
        },
    },
    {
        files: ["src/**/*.{ts,tsx,mts,cts}", "test/**/*.{ts,tsx,mts,cts}"],
        name: "Local Mutable Framework Callback Boundaries",
        rules: {
            "@typescript-eslint/prefer-readonly-parameter-types": "off",
        },
    },
    {
        files: ["src/meta.ts", "src/utils/validator-factory.ts"],
        name: "Local Runtime JSON Module Imports",
        rules: {
            "import-x/extensions": "off",
        },
    },
    {
        files: ["src/**/*.{ts,tsx,mts,cts}"],
        name: "Local JSON Schema Validator",
        plugins: {
            "json-schema-validator-2": plugin,
        },
    },
];

export default config;
