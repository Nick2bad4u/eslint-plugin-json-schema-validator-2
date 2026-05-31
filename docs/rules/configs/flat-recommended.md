---
title: flat/recommended
description: Compatibility alias for the recommended flat config.
---

# `configs["flat/recommended"]`

`configs["flat/recommended"]` is a compatibility alias for
`configs.recommended`.

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator-2";

export default [...jsonSchemaValidator.configs["flat/recommended"]];
```

It registers the same parser setup as `configs.base` and enables
`json-schema-validator-2/no-invalid` as a warning for JSON, JSONC, JSON5, YAML,
and TOML files.

Prefer `configs.recommended` for new Flat Config setups. Keep this alias only
when you are preserving an older config shape or matching existing shared config
conventions.
