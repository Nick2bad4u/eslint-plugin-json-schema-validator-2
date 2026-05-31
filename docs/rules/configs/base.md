---
title: base
description: What the base flat config wires into ESLint.
---

# `configs.base`

Use `configs.base` when you want parser and plugin setup without enabling the
validation rule.

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator-2";

export default [
 ...jsonSchemaValidator.configs.base,
 {
  files: ["config/*.json"],
  rules: {
   "json-schema-validator-2/no-invalid": "error",
  },
 },
];
```

This config does three things:

- Registers the plugin under the `json-schema-validator-2` namespace.
- Uses `jsonc-eslint-parser` for JSON, JSONC, and JSON5 files.
- Uses `yaml-eslint-parser` for YAML files and `toml-eslint-parser` for TOML
  files.

It also disables a small set of ESLint core rules that are unsafe or noisy for
data-file ASTs, such as `strict`, `no-unused-vars`, `no-unused-expressions`,
`no-irregular-whitespace`, and `spaced-comment` where those rules conflict with
the parser.

`configs.base` does not enable `json-schema-validator-2/no-invalid`. That is
intentional: it is the foundation for custom rule severity, custom file scopes,
or shared configs that want parser setup only.

The legacy `configs["flat/base"]` export points to the same config array.
