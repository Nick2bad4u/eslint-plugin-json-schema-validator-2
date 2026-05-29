# eslint-plugin-json-schema-validator

ESLint rules that validate JSON, JSONC, JSON5, YAML, TOML, JavaScript exports,
and Vue custom blocks with JSON Schema.

This fork keeps the useful validation behavior from the upstream plugin while
moving the repository onto the modern ESLint plugin tooling used across
Nick2bad4u plugin projects.

## Installation

```bash
npm install --save-dev eslint eslint-plugin-json-schema-validator
```

## Usage

Use Flat Config:

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator";

export default [
  ...jsonSchemaValidator.configs.recommended,
];
```

The plugin exposes these configs:

- `jsonSchemaValidator.configs.base` registers the JSON, YAML, and TOML parsers.
- `jsonSchemaValidator.configs.recommended` adds `json-schema-validator/no-invalid`.
- `jsonSchemaValidator.configs["flat/base"]` is a compatibility alias for `base`.
- `jsonSchemaValidator.configs["flat/recommended"]` is a compatibility alias for `recommended`.

## Rules

| Rule | Description | Fix |
| --- | --- | --- |
| [`no-invalid`](https://nick2bad4u.github.io/eslint-plugin-json-schema-validator-2/docs/rules/no-invalid) | validate object with JSON Schema. | report only |

## Advanced Configuration

Use rule options when a file does not advertise a `$schema` field, when you want
to disable SchemaStore detection, or when you need to merge multiple schema
sources:

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

## Related Packages

- [JSON Schema](https://json-schema.org/)
- [SchemaStore](https://www.schemastore.org/json/)
- [jsonc-eslint-parser](https://github.com/ota-meshi/jsonc-eslint-parser)
- [yaml-eslint-parser](https://github.com/ota-meshi/yaml-eslint-parser)
- [toml-eslint-parser](https://github.com/ota-meshi/toml-eslint-parser)

## License

MIT
