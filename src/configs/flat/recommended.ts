import type { Linter } from "eslint";

import base from "./base.ts";

const recommended: Linter.Config[] = [
  ...base,
  {
    rules: {
      // eslint-plugin-json-schema-validator-2 rules
      "json-schema-validator-2/no-invalid": "warn",
    },
  },
];

export default recommended;
