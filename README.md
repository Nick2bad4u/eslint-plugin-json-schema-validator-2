# eslint-plugin-json-schema-validator-2

[![npm license.](https://flat.badgen.net/npm/license/eslint-plugin-json-schema-validator-2?color=purple)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/blob/main/LICENSE) [![npm total downloads.](https://flat.badgen.net/npm/dt/eslint-plugin-json-schema-validator-2?color=pink)](https://www.npmjs.com/package/eslint-plugin-json-schema-validator-2) [![latest GitHub release.](https://flat.badgen.net/github/release/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=cyan)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/releases) [![GitHub stars.](https://flat.badgen.net/github/stars/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=yellow)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/stargazers) [![GitHub forks.](https://flat.badgen.net/github/forks/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=green)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/forks) [![GitHub open issues.](https://flat.badgen.net/github/open-issues/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=red)](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/issues) [![codecov.](https://flat.badgen.net/codecov/github/Nick2bad4u/eslint-plugin-json-schema-validator-2?color=blue)](https://codecov.io/gh/Nick2bad4u/eslint-plugin-json-schema-validator-2)

ESLint rules that validate JSON, JSONC, JSON5, YAML, TOML, Markdown
frontmatter, JavaScript exports, and Vue custom blocks with JSON Schema.

This fork keeps the useful validation behavior from the upstream plugin while
moving the repository onto the modern ESLint plugin tooling used across
Nick2bad4u plugin projects.

Shoutout to [ota-meshi/eslint-plugin-json-schema-validator](https://github.com/ota-meshi/eslint-plugin-json-schema-validator),
which this fork builds on. The original plugin did the hard work of proving the
JSON Schema validation model for JSON-like files in ESLint.

## Installation

```bash
npm install --save-dev eslint eslint-plugin-json-schema-validator-2
```

## Usage

Use Flat Config:

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator-2";

export default [
  ...jsonSchemaValidator.configs.recommended,
];
```

The plugin exposes these configs:

- `jsonSchemaValidator.configs.base` registers the JSON, YAML, and TOML parsers.
- `jsonSchemaValidator.configs.frontmatter` registers the structured-data parsers
  plus a Markdown-family YAML frontmatter processor.
- `jsonSchemaValidator.configs.recommended` adds `json-schema-validator-2/no-invalid`.
- `jsonSchemaValidator.configs["flat/base"]` is a compatibility alias for `base`.
- `jsonSchemaValidator.configs["flat/frontmatter"]` is a compatibility alias for
  `frontmatter`.
- `jsonSchemaValidator.configs["flat/recommended"]` is a compatibility alias for `recommended`.

Full setup details live in the [user guide](docs/user-guide/index.md). Rule
behavior, every option, and implementation links live in the
[`no-invalid` rule docs](docs/rules/no-invalid.md).

## Rules

| Rule | Description | Fix |
| --- | --- | --- |
| [`no-invalid`](https://nick2bad4u.github.io/eslint-plugin-json-schema-validator-2/docs/rules/no-invalid) | validate object with JSON Schema. | report only |

## Advanced Configuration

SchemaStore detection is on by default. If a file name matches a SchemaStore
catalog entry, `json-schema-validator-2/no-invalid` downloads that schema and
validates the file without extra configuration. Set
`useSchemastoreCatalog: false` only when you want to opt out for a specific
override.

Standard JSON Schema formats from `ajv-formats` are enabled by default, so
schemas using formats such as `email`, `uri`, `uuid`, and `date-time` validate
without extra setup.

Use rule options when a file does not advertise a `$schema` field, when you need
to add local or remote custom schemas, or when you need to merge multiple schema
sources. The same options are documented in
[json-schema-validator-2/no-invalid](docs/rules/no-invalid.md):

```js
export default [
  ...jsonSchemaValidator.configs.base,
  {
    rules: {
      "json-schema-validator-2/no-invalid": [
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

Each custom schema entry has:

- `fileMatch`: file names or glob patterns matched against the linted file.
- `schema`: either an inline JSON Schema object, a local schema file path, or a
  remote schema URL.

For local project schemas, point `schema` at a checked-in schema file:

```js
export default [
  ...jsonSchemaValidator.configs.base,
  {
    rules: {
      "json-schema-validator-2/no-invalid": [
        "error",
        {
          schemas: [
            {
              fileMatch: ["config/*.json", ".my-toolrc.json"],
              schema: "./schemas/my-tool.schema.json",
            },
          ],
        },
      ],
    },
  },
];
```

For one-off schemas, you can also inline the schema:

```js
export default [
  ...jsonSchemaValidator.configs.base,
  {
    rules: {
      "json-schema-validator-2/no-invalid": [
        "error",
        {
          schemas: [
            {
              fileMatch: ["settings/*.json"],
              schema: {
                additionalProperties: false,
                properties: {
                  enabled: { type: "boolean" },
                },
                required: ["enabled"],
                type: "object",
              },
            },
          ],
        },
      ],
    },
  },
];
```

When a file has its own `$schema` property and you also want matching custom or
SchemaStore schemas to apply, enable `mergeSchemas`. Use `true` to merge every
source, or pass an ordered list such as `["$schema", "options", "catalog"]`.

YAML files can also advertise a schema with a language-server directive comment:

```yaml
# yaml-language-server: $schema=./schemas/config.schema.json
enabled: true
```

The rule uses a normal YAML `$schema` property first. The directive comment is a
fallback for YAML files that cannot include `$schema` in the validated data.

Use `reportMode: "most-specific"` when broad composition errors are drowning out
more useful nested errors:

```js
export default [
  ...jsonSchemaValidator.configs.base,
  {
    rules: {
      "json-schema-validator-2/no-invalid": [
        "error",
        {
          reportMode: "most-specific",
        },
      ],
    },
  },
];
```

Remote SchemaStore and `$schema` downloads are cached under the plugin cache
directory by default. Configure the shared cache if your CI needs a persistent
or workspace-local cache:

```js
export default [
  {
    settings: {
      "json-schema-validator-2": {
        cache: {
          directory: ".cache/json-schema-validator-2",
          ttl: 1000 * 60 * 60 * 24 * 30,
        },
      },
    },
  },
];
```

Set `ttl: false` to keep using cached remote schemas without scheduling a
background refresh.

## Markdown frontmatter

Use `configs.frontmatter` when you want to validate leading YAML frontmatter in
Markdown, MDX, or MDC files. The processor exposes the frontmatter as a virtual
`*.frontmatter.yaml` file, so configure schemas against that filename:

```js
export default [
  ...jsonSchemaValidator.configs.frontmatter,
  {
    rules: {
      "json-schema-validator-2/no-invalid": [
        "error",
        {
          schemas: [
            {
              fileMatch: ["**/*.frontmatter.yaml"],
              schema: "./schemas/frontmatter.schema.json",
            },
          ],
          useSchemastoreCatalog: false,
        },
      ],
    },
  },
];
```

See the [getting started guide](docs/docusaurus/site-docs/getting-started.md)
for the shorter site walkthrough and the [rule overview](docs/rules/overview.md)
for the rule catalog.

## Related Packages

- [JSON Schema](https://json-schema.org/)
- [SchemaStore](https://www.schemastore.org/json/)
- [jsonc-eslint-parser](https://github.com/ota-meshi/jsonc-eslint-parser)
- [yaml-eslint-parser](https://github.com/ota-meshi/yaml-eslint-parser)
- [toml-eslint-parser](https://github.com/ota-meshi/toml-eslint-parser)

## License

MIT
