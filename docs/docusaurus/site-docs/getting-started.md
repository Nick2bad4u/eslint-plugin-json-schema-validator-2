---
sidebar_position: 2
---

# Getting Started

Install ESLint and the plugin:

```bash
npm install --save-dev eslint eslint-plugin-json-schema-validator-2
```

Enable the recommended Flat Config preset:

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator-2";

export default [...jsonSchemaValidator.configs.recommended];
```

The recommended preset registers parsers for JSON, YAML, and TOML files and
enables `json-schema-validator-2/no-invalid` as a warning.

The complete option reference is in the
[`no-invalid` rule docs](https://nick2bad4u.github.io/eslint-plugin-json-schema-validator-2/docs/rules/no-invalid/).
The broader README is
available in the
[repository root](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2#readme).

## Custom schemas

Pass schemas directly to the rule when a file does not advertise a `$schema`
property or when you need to override SchemaStore detection:

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

## YAML schema comments

YAML files can use a language-server directive when the validated data cannot
include a `$schema` property:

```yaml
# yaml-language-server: $schema=./schemas/config.schema.json
enabled: true
```

The rule prefers a normal YAML `$schema` property when one exists, then falls
back to the directive comment.

## Reporting and cache settings

Use `reportMode: "most-specific"` to hide broad parent errors when deeper errors
already identify the failing value:

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

Remote schemas are cached automatically for 30 days. Configure the cache from
shared settings when CI or local tooling needs a specific location:

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

Set `ttl: false` if you want to keep using cached remote schemas without
scheduling background refreshes.

## Markdown frontmatter

Use `configs.frontmatter` to validate leading YAML frontmatter in Markdown, MDX,
or MDC files. The processor exposes the frontmatter as a virtual
`*.frontmatter.yaml` file:

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
