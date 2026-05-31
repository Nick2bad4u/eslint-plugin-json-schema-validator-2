---
title: flat/frontmatter
description: Compatibility alias for the frontmatter flat config.
---

# `configs["flat/frontmatter"]`

`configs["flat/frontmatter"]` is a compatibility alias for
`configs.frontmatter`.

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator-2";

export default [...jsonSchemaValidator.configs["flat/frontmatter"]];
```

It registers the same parser setup as `configs.base` and attaches the
`json-schema-validator-2/frontmatter` processor to Markdown, MDX, and MDC files.

It does not enable `json-schema-validator-2/no-invalid` by itself. Prefer
`configs.frontmatter` for new Flat Config setups, then add the validation rule
with the schema that matches your frontmatter data.
