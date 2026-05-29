---
sidebar_position: 2
---

# Getting Started

Install ESLint and the plugin:

```bash
npm install --save-dev eslint eslint-plugin-json-schema-validator
```

Enable the recommended Flat Config preset:

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator";

export default [
  ...jsonSchemaValidator.configs.recommended,
];
```

The recommended preset registers parsers for JSON, YAML, and TOML files and
enables `json-schema-validator/no-invalid` as a warning.

## Custom schemas

Pass schemas directly to the rule when a file does not advertise a `$schema`
property or when you need to override SchemaStore detection:

```js
export default [
  ...jsonSchemaValidator.configs.base,
  {
    rules: {
      "json-schema-validator/no-invalid": [
        "error",
        {
          schemas: [
            {
              fileMatch: ["config/*.json"],
              schema: "./schemas/config.schema.json",
            },
          ],
          useSchemastoreCatalog: false,
        },
      ],
    },
  },
];
```
