---
title: frontmatter
description: What the frontmatter flat config enables.
---

# `configs.frontmatter`

Use `configs.frontmatter` when you want ESLint to extract leading YAML
frontmatter from Markdown-family files.

```js
import jsonSchemaValidator from "eslint-plugin-json-schema-validator-2";

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

This config expands `configs.base`, then attaches the
`json-schema-validator-2/frontmatter` processor to:

- `*.md`
- `*.mdx`
- `*.mdc`

The processor exposes the leading frontmatter block as a virtual
`*.frontmatter.yaml` file. The config does not enable
`json-schema-validator-2/no-invalid` by itself, because frontmatter schemas are
project-specific. Add a rule override with the schema that matches your docs
metadata.

The legacy `configs["flat/frontmatter"]` export points to the same config
array.
