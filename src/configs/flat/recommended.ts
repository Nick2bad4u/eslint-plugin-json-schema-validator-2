import type { Linter } from "eslint";

import base from "./base.js";
import { structuredDataFilePatterns } from "./file-patterns.js";

/** Recommended flat config that enables the validation rule. */
const recommended: Linter.Config[] = [
    ...base,
    {
        files: [...structuredDataFilePatterns],
        name: "json-schema-validator-2/recommended",
        rules: {
            // eslint-plugin-json-schema-validator-2 rules
            "json-schema-validator-2/no-invalid": "warn",
        },
    },
];

export default recommended;
