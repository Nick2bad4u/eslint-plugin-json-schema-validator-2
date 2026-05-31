---
title: recommended
description: What the recommended flat config enables.
---

# `configs.recommended`

Use `configs.recommended` when you want the normal plugin behavior for
structured data files.

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator-2";

export default [...jsonSchemaValidator.configs.recommended];
```

This config expands `configs.base`, then enables
`json-schema-validator-2/no-invalid` as a warning for these file families:

- JSON, JSONC, and JSON5: `*.json`, `*.jsonc`, `*.json5`
- YAML: `*.yaml`, `*.yml`
- TOML: `*.toml`

It intentionally scopes the rule to structured data files. If you want to
validate JavaScript module exports, Vue custom blocks, or another custom file
family, keep `configs.base` and add a targeted rule override for those files.

The legacy `configs["flat/recommended"]` export points to the same config array.
