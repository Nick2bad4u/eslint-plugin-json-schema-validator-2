---
applyTo: "**"
---

# Repository Instructions

This repository is an ESLint flat-config plugin for validating JSON-like data
with JSON Schema. Prefer modern ESLint plugin patterns, strict TypeScript, and
small, focused changes that preserve release checks.

## Engineering Standards

- Use ESM imports and exports only.
- Keep plugin metadata current: plugin `meta`, rule `meta`, processor `meta`,
  and flat config `name` values should remain stable and explicit.
- Keep `configs.base` parser-only. Enable rules in `configs.recommended` or
  user overrides.
- Scope flat config rule entries with `files` when the rule should only apply
  to parser-supported file families.
- Avoid `any`; use precise types, `unknown` plus narrowing, or existing
  `type-fest` and `ts-extras` utilities.
- Do not add runtime dependencies for small deterministic utilities without a
  clear maintenance or correctness win.

## Validation

Before release-facing changes are considered done, run:

```bash
npm run release:verify
```

For narrower edits, at minimum run the focused Vitest files, focused ESLint
files with `--no-cache`, and `npm run typecheck`.
