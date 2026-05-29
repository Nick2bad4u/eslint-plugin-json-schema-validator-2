---
pageClass: "rule-details"
sidebarDepth: 0
title: "json-schema-validator-2/no-invalid"
description: "validate object with JSON Schema."
since: "v0.1.0"
---

# json-schema-validator-2/no-invalid

> validate object with JSON Schema.

- :gear: This rule is included in `configs.recommended`.

## :book: Rule Details

This rule validates the file with JSON Schema and reports errors.

It supports JSON, JSONC, JSON5, YAML, TOML, JavaScript object exports,
Markdown-family YAML frontmatter through `configs.frontmatter`, and Vue custom
blocks when `eslint-plugin-vue` is installed.

<!-- eslint-skip -->

```json5
// File name is ".eslintrc.json"
/* eslint json-schema-validator-2/no-invalid: 'error' */
{
  overrides: [
    {
      files: ["good"],
      /* ✓ GOOD */
      extends: ["foo"],
    },
    {
      files: ["bad"],
      /* ✗ BAD */
      extends: [42],
    },
  ],
}
```

## :wrench: Options {#options}

```json5
{
  "json-schema-validator-2/no-invalid": [
    "error",
    {
      schemas: [
        {
          fileMatch: [".eslintrc.json"],
          schema: {
            /* JSON Schema Definition */
          }, // or string
        },
      ],
      useSchemastoreCatalog: true,
      mergeSchemas: true, // or ["$schema", "options", "catalog"]
      reportMode: "all", // or "most-specific"
    },
  ],
}
```

- `schemas` ... Define an array of any JSON Schema.
  - `fileMatch` ... A list of known file names (or globs) that match the schema.
  - `schema` ... An object that defines a JSON schema. Or the path of the JSON schema file or URL.
- `useSchemastoreCatalog` ... If `true`, it will automatically configure some schemas defined in [https://www.schemastore.org/api/json/catalog.json](https://www.schemastore.org/api/json/catalog.json). Default `true`
- `mergeSchemas` ... If `true`, it will merge all schemas defined in `schemas`, at the `$schema` field within files, and the catalogue. If an array is given, it will merge only schemas from the given sources. Default `false`
- `reportMode` ... Controls which validation errors are reported. Use `"all"` to keep every Ajv error, or `"most-specific"` to suppress ancestor-path errors when deeper errors point at the same failing data. Default `"all"`

Use the
[user guide](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/blob/main/docs/user-guide/index.md#zap-advanced-usage)
for shared settings such as cache and HTTP configuration, and the
[project README](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2#advanced-configuration)
for a compact Flat Config example.

Standard JSON Schema formats from `ajv-formats` are enabled by default. Formats
such as `email`, `uri`, `uuid`, and `date-time` validate without additional
configuration.

This option can also be given a JSON schema file or URL. This is useful for configuring with the `/* eslint */` directive comments.

<!-- eslint-skip -->

```js
/* eslint json-schema-validator-2/no-invalid: [
      "error",
      "https://www.schemastore.org/eslintrc"
   ]
*/

module.exports = {
  overrides: [
    {
      files: ["good"],
      /* ✓ GOOD */
      extends: ["foo"],
    },
    {
      files: ["bad"],
      /* ✗ BAD */
      extends: [42],
    },
  ],
};
```

### YAML language-server schema comments

YAML files can use a language-server directive comment when the validated data
cannot include a `$schema` property:

```yaml
# yaml-language-server: $schema=./schemas/config.schema.json
enabled: true
```

The rule prefers a normal YAML `$schema` property when one exists. The
`yaml-language-server` directive is used only as a fallback.

### Schema cache settings

Remote schemas are cached by default. Configure the shared plugin settings when
you need a specific cache directory or time-to-live:

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

`ttl` is measured in milliseconds. Set `ttl: false` to keep using cached remote
schemas without scheduling a background refresh.

### Markdown frontmatter

Use `configs.frontmatter` to validate leading YAML frontmatter in Markdown, MDX
or MDC files. The processor exposes the frontmatter as a virtual
`*.frontmatter.yaml` file, so match schemas against that filename:

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

### Use with `.vue`

This rule supports [`.vue` custom blocks](https://vue-loader.vuejs.org/guide/custom-blocks.html).

Example:

```vue
<i18n>
{
    "en": {
        "hello": "Hello"
    }
}
</i18n>
```

You must also install [eslint-plugin-vue](https://eslint.vuejs.org/) to enable `.vue` files validation. See [here](https://eslint.vuejs.org/user-guide/) for details.

To match a custom block, use a glob like this:

```json5
{
  // If you want to match the <i18n> block.
  fileMatch: ["**/*blockType=i18n*"],
  schema: { type: "object" /* JSON Schema Definition */ },
}
```

The following custom blocks will try to test if it matches with the virtual filenames.

<!-- eslint-skip -->

```vue
<i18n lang="yaml">
# path/to/foo.vue/i18n.yaml?vue&type=custom&blockType=i18n&lang=yaml
foo: bar
</i18n>

<i18n lang="json">
// path/to/foo.vue/i18n.json?vue&type=custom&blockType=i18n&lang=json
{ "foo": "bar" }
</i18n>

<i18n>
// path/to/foo.vue/i18n.json?vue&type=custom&blockType=i18n
{ "foo": "bar"}
</i18n>
```

## :books: Further reading

- [User guide](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/blob/main/docs/user-guide/index.md)
- [Rule overview](./overview.md)
- [JSON Schema](https://json-schema.org/)
- [JSON Schema Store](https://www.schemastore.org/json/)

## :rocket: Version

This rule was introduced in eslint-plugin-json-schema-validator-2 v0.1.0

## :mag: Implementation

- [Rule source](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/blob/main/src/rules/no-invalid.ts)
- [Test source](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/blob/main/test/src/rules/no-invalid.test.ts)
- [Test fixture sources](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/tree/main/test/fixtures/rules/no-invalid)
