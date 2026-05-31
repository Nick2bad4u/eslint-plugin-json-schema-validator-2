# User Guide

## :cd: Installation

```bash
npm install --save-dev eslint eslint-plugin-json-schema-validator-2
```

::: tip Requirements

- ESLint v9.38.0 and above
- Node.js v22.0.0 or higher

:::

## :book: Usage

<!--USAGE_GUIDE_START-->

### Configuration

Use `eslint.config.js` or `eslint.config.mjs` to configure rules. See also:
<https://eslint.org/docs/latest/use/configure/configuration-files>.

Example **eslint.config.js**:

```js
import eslintPluginJsonSchemaValidator from "eslint-plugin-json-schema-validator-2";
export default [
 // add more generic rule sets here, such as:
 // js.configs.recommended,
 ...eslintPluginJsonSchemaValidator.configs.recommended,
 {
  rules: {
   // override/add rules settings here, such as:
   // 'json-schema-validator-2/no-invalid': 'warn'
  },
 },
];
```

This plugin provides configs:

- `*.configs.base` ... Configuration to enable correct JSON, YAML and TOML parsing.
- `*.configs.frontmatter` ... Above, plus a processor that extracts leading YAML frontmatter from Markdown, MDX and MDC files as virtual `*.frontmatter.yaml` files.
- `*.configs.recommended` ... Above, plus rule to validate JSON, JSONC, JSON5,
  YAML, and TOML files with JSON Schema.

See [the rule list](../rules/overview.md) and the
[`no-invalid` reference](../rules/no-invalid.md) for every option this plugin
provides.

For backward compatibility, the `flat/` prefix can still be used:

- `*.configs["flat/base"]` is an alias for `*.configs.base`
- `*.configs["flat/frontmatter"]` is an alias for `*.configs.frontmatter`
- `*.configs["flat/recommended"]` is an alias for `*.configs.recommended`

### Running ESLint from the command line

If you want to run `eslint` from the command line, use explicit globs that
include the structured-data files you want linted. Relying on a directory target
is easy to misconfigure because ESLint's default file selection is centered on
JavaScript-family files.

Examples:

```bash
eslint --ext .js,.json,.jsonc,.json5,.yaml,.yml,.toml src
eslint "src/**/*.{js,json,jsonc,json5,yaml,yml,toml}"
```

## :computer: Editor Integrations

### Visual Studio Code

Use the [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension that Microsoft provides officially.

You have to configure the `eslint.validate` option of the extension to check `.json`, `.jsonc`, `.json5`, `.yaml`, `.yml` and `.toml` files, because the extension targets only `*.js` or `*.jsx` files by default.

Example **.vscode/settings.json**:

```json
{
 "eslint.validate": [
  "javascript",
  "javascriptreact",
  "json",
  "jsonc",
  "json5",
  "yaml",
  "toml"
 ]
}
```

<!--USAGE_GUIDE_END-->

<!--ADVANCED_USAGE_GUIDE_START-->

## :zap: Advanced Usage

### Settings

Use Flat Config `settings` to configure shared plugin behavior. See also: [https://eslint.org/docs/latest/use/configure/configuration-files#configuring-shared-settings](https://eslint.org/docs/latest/use/configure/configuration-files#configuring-shared-settings).

Example **eslint.config.js**:

```js
export default [
 {
  settings: {
   "json-schema-validator-2": {
    cache: {
     directory: ".cache/json-schema-validator-2",
     ttl: 1000 * 60 * 60 * 24 * 30,
    },
    http: {
     getModulePath: "",
     requestOptions: {},
    },
   },
  },
 },
];
```

- `cache` ... Settings for remote schema cache files.
  - `directory` ... Cache directory. Relative paths resolve from the ESLint current working directory. The default is `node_modules/.cache/eslint-plugin-json-schema-validator-2` when the plugin is installed under `node_modules`, with `.cache/eslint-plugin-json-schema-validator-2` as the workspace fallback.
  - `ttl` ... Cache time-to-live in milliseconds. The default is 30 days. Use `false` to keep cached entries without scheduling background refreshes.
- `http` ... Settings to resolve schema URLs.
  - `getModulePath` ... Module path to `GET` the URL. The default implementation is [./src/utils/http-client/get-modules/http.ts](https://github.com/Nick2bad4u/eslint-plugin-json-schema-validator-2/blob/main/src/utils/http-client/get-modules/http.ts).
  - `requestOptions` ... Options used in the module.

#### Example of `http`

Example of using the `request` module for HTTP requests.

**`./path/to/request-get.js`**:

```js
const request = require("request");

/**
 * GET Method using request module.
 */
module.exports = function get(url, options) {
 return new Promise((resolve, reject) => {
  request.get(url, options, (error, _res, body) => {
   if (error) {
    reject(error);
    return;
   }
   resolve(body);
  });
 });
};
```

**eslint.config.js**:

<!-- eslint-skip -->

```js
export default [
 {
  settings: {
   "json-schema-validator-2": {
    http: {
     getModulePath: "./path/to/request-get.js",
     requestOptions: {
      // Example of proxy settings.
      proxy: "http://my.proxy.com:8080/",
     },
    },
   },
  },
 },
];
```

<!--ADVANCED_USAGE_GUIDE_END-->

## :question: FAQ

### Does SchemaStore run by default?

Yes. `json-schema-validator-2/no-invalid` uses SchemaStore by default when the
linted filename matches a catalog entry. Set `useSchemastoreCatalog: false` in
an override when a local schema should be the only source of truth.

### How do I validate Markdown frontmatter?

Use `configs.frontmatter`, then match your schema against
`**/*.frontmatter.yaml`. See the
[Markdown frontmatter section](../rules/no-invalid.md#markdown-frontmatter) for
a complete Flat Config example.
