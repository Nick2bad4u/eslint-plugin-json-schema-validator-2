# Contributing to eslint-plugin-json-schema-validator-2

Thanks for your interest in contributing.

This repository contains an ESLint plugin that validates JSON, JSONC, JSON5,
YAML, TOML, JavaScript exports, and Vue custom blocks with JSON Schema.

## Prerequisites

- Node.js `>=22.0.0` (see `package.json#engines`)
- npm `>=11`
- Git

## Local Setup

1. Fork and clone the repository.

2. Install dependencies from the repository root:

   ```bash
   npm ci --force
   ```

3. Run the main quality gate:

   ```bash
   npm run lint:all:fix
   npm run typecheck
   npm test
   ```

## Recommended Workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Add or update tests in `test/` when behavior changes.
4. Update relevant documentation in `docs/` and root docs when needed.
5. Run validation commands before opening a pull request.

## Debugging and Logging Policy

- `src/**` and `plugin.mjs`: do not commit `console.*` or `debugger`
  statements.
- `scripts/**`: `console.log`, `console.warn`, and `console.error` are allowed
  for CLI progress and diagnostics.
- `test/**`: avoid noisy logging unless a test is explicitly validating logging
  behavior.

When adding script output, prefer this severity split:

- `console.log`: normal progress
- `console.warn`: recoverable issue or fallback behavior
- `console.error`: failure path, usually followed by a non-zero exit code

## Project Layout

```text
.
├── src/                  # Plugin source and rule implementations
├── test/                 # Rule tests and test helpers
├── docs/                 # Rule docs and Docusaurus docs app
├── scripts/              # Repository scripts
├── .github/              # Workflows and automation configs
└── package.json          # Scripts, dependencies, metadata
```

## Validation Commands

Use these commands locally before submitting a pull request:

- `npm run typecheck`
- `npm test`
- `npm run lint:all:fix`

Optional focused checks:

- `npm run lint:compat:eslint9` for the built-plugin ESLint compatibility smoke
- `npm run changelog:preview` to preview unreleased changelog output
- `npm run docs:build` to validate the Docusaurus site

## Commit Guidance

Gitmoji plus Conventional Commit types are recommended because release notes and
changelog tooling are commit-message aware.

Format:

- `:gitmoji: type(scope?): subject`

Examples:

- `:sparkles: feat(rule): add schema catalog option`
- `:bug: fix(rule): avoid false positive for nested YAML arrays`
- `:memo: docs: clarify flat config usage`

## Pull Request Expectations

- Keep pull requests scoped and reviewable.
- Include tests for behavior changes.
- Keep docs in sync with implementation changes.
- Do not include generated lockfile churn unrelated to the change.

## Security

Do not open public issues for potential vulnerabilities. Use the process
described in [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree your contributions are licensed under the
[MIT License](./LICENSE).
