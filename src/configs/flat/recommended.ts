import type { Linter } from "eslint";

import base from "./base.ts";

const recommended: Linter.Config[] = [
  ...base,
  {
    rules: {
      // eslint-plugin-json-schema-validator rules
      "json-schema-validator/no-invalid": "warn",
    },
  },
];

export default recommended;
