# Copilot Instructions

Work in this repository as an ESLint plugin project, not as a generic Node
package.

- Use flat-config-first ESLint patterns and keep `src/plugin.ts`,
  `src/plugin-core.ts`, and `src/configs/flat/**` aligned.
- Every rule must have complete metadata: `meta.type`, `meta.docs`,
  `meta.messages`, `meta.schema`, and `meta.defaultOptions` when defaults
  exist.
- Keep rule docs in `docs/rules/` synchronized with rule metadata and tests.
- Validate behavior with focused Vitest or RuleTester coverage before relying on
  broad release scripts.
- Avoid generated-file churn. TypeDoc, Docusaurus build output, inspector output,
  coverage output, and duplicate-detection reports should only be committed when
  they are intentionally tracked artifacts.
- Prefer precise TypeScript types, `unknown` plus narrowing at unsafe
  boundaries, and existing local utilities over ad hoc parsing.
- Do not weaken release gates to make a check pass. Fix the underlying package,
  docs, metadata, or test issue.
