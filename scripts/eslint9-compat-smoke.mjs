import { ESLint } from "eslint";

import plugin from "../dist/plugin.js";

const eslint = new ESLint({
    overrideConfig: [
        ...plugin.configs.recommended,
        {
            files: ["**/*.json"],
            rules: {
                "json-schema-validator-2/no-invalid": [
                    "error",
                    {
                        schemas: [
                            {
                                fileMatch: ["package.json"],
                                schema: {
                                    additionalProperties: true,
                                    properties: {
                                        name: {
                                            type: "string",
                                        },
                                    },
                                    required: ["name"],
                                    type: "object",
                                },
                            },
                        ],
                        useSchemastoreCatalog: false,
                    },
                ],
            },
        },
    ],
    overrideConfigFile: true,
});

const [result] = await eslint.lintText("{}", {
    filePath: "package.json",
});

if (result === undefined || result.errorCount === 0) {
    throw new Error("Expected json-schema-validator-2/no-invalid to report.");
}

console.log("ESLint compatibility smoke passed.");
