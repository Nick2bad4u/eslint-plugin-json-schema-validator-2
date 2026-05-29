# eslint-plugin-json-schema-validator

[![npm license.](https://flat.badgen.net/npm/license/eslint-plugin-json-schema-validator-2?color=purple)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator/blob/main/LICENSE) [![npm total downloads.](https://flat.badgen.net/npm/dt/eslint-plugin-json-schema-validator-2?color=pink)](https://www.npmjs.com/package/eslint-plugin-json-schema-validator) [![latest GitHub release.](https://flat.badgen.net/github/release/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=cyan)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator/releases) [![GitHub stars.](https://flat.badgen.net/github/stars/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=yellow)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator/stargazers) [![GitHub forks.](https://flat.badgen.net/github/forks/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=green)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator/forks) [![GitHub open issues.](https://flat.badgen.net/github/open-issues/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=red)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator/issues) [![codecov.](https://flat.badgen.net/codecov/github/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=blue)](https://codecov.io/gh/Nick2bad4u/eslint-plugin-json-schema-validator)

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
