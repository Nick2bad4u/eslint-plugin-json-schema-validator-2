---
title: flat/base
description: Compatibility alias for the base flat config.
---

# `configs["flat/base"]`

`configs["flat/base"]` is a compatibility alias for `configs.base`.

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator-2";

export default [...jsonSchemaValidator.configs["flat/base"]];
```

It registers the plugin, configures the JSONC, YAML, and TOML parsers, and
turns off ESLint core rules that do not behave well on structured data parser
ASTs.

It does not enable `json-schema-validator-2/no-invalid`. Prefer `configs.base`
for new Flat Config setups, then add the validation rule where you need it.
