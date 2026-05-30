---
title: Overview
description: Rule documentation overview for eslint-plugin-json-schema-validator-2.
---

`eslint-plugin-json-schema-validator-2` focuses on validating structured project
data against JSON Schema during normal ESLint runs.

The current rule catalog is intentionally small:

| Rule                                                    | Purpose                                                                                 | Preset        |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------- |
| [`json-schema-validator-2/no-invalid`](./no-invalid.md) | Validate structured data against `$schema`, SchemaStore, and configured custom schemas. | `recommended` |

Use the
[getting started guide](https://nick2bad4u.github.io/eslint-plugin-json-schema-validator-2/docs/getting-started/)
for
the shortest setup path, then move to the
[`no-invalid` options](./no-invalid.md#Options) when you need custom
schemas, YAML language-server comments, SchemaStore behavior, report filtering,
or remote schema cache settings.

New rules should be added only when they have a clear schema-validation use case
and can run efficiently during editor linting. If a feature only changes how
schema discovery or Ajv reporting works, it belongs as a focused
`no-invalid` option instead of a separate traversal rule.
