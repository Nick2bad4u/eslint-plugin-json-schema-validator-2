import nickTwoBadFourU from "eslint-config-nick2bad4u";

import plugin from "./plugin.mjs";

const baseConfig = nickTwoBadFourU.configs.all;

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...baseConfig,

    {
        files: ["src/**/*.{ts,tsx,mts,cts}"],
        name: "Local JSON Schema Validator",
        plugins: {
            "json-schema-validator-2": plugin,
        },
    },
];

export default config;
