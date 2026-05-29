---
title: Getting Started
description: Configure eslint-plugin-json-schema-validator with ESLint Flat Config.
---

# Getting Started

Use the plugin from `eslint.config.js`:

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator";

export default [
  ...jsonSchemaValidator.configs.recommended,
];
```

Use `configs.base` when you want parser setup without enabling the validation
rule:

```js
export default [
  ...jsonSchemaValidator.configs.base,
  {
    rules: {
      "json-schema-validator/no-invalid": "error",
    },
  },
];
```

The legacy `configs["flat/base"]` and `configs["flat/recommended"]` aliases are
still exported for compatibility.
