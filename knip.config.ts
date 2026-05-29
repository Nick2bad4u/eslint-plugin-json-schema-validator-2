/**
 * Repository-specific configuration for Knip dependency analysis.
 *
 * @packageDocumentation
 */
import type { KnipConfig } from "knip";

/**
 * Knip configuration that scopes entry points and dependency heuristics to the
 * repository layout.
 */
const knipConfig: KnipConfig = {
    $schema: "https://unpkg.com/knip@5/schema.json",
    entry: [],
    ignore: [
        "docs/docusaurus/src/css/custom.css.d.ts",
        "docs/docusaurus/typedoc-plugins/hash-to-bang-links.mjs",
        "docs/docusaurus/typedoc-plugins/hash-to-bang-links-core.mjs",
        "docs/docusaurus/typedoc-plugins/prefix-doc-links.mjs",
        "docs/docusaurus/typedoc-plugins/prefix-doc-links-core.mjs",
        "docs/docusaurus/site-docs/developer/api/**",
        "test/fixtures/**",
    ],
    ignoreBinaries: [
        "git-cz",
        "grype",
        "open-cli",
        // False-positve Knip thinks knip.config.ts is a binary entry point, but it's actually just a config file.
        "knip.config.ts",
    ],
    ignoreDependencies: [
        ".*prettier.*",
        "@docusaurus/faster",
        "@easyops-cn/docusaurus-search-local",
        "@easyops-cn/docusaurus-theme-docusaurus-search-local",
        "@eslint.*",
        "@microsoft/tsdoc-config",
        "@secretlint/secretlint-rule-anthropic",
        "@secretlint/secretlint-rule-aws",
        "@secretlint/secretlint-rule-database-connection-string",
        "@secretlint/secretlint-rule-gcp",
        "@secretlint/secretlint-rule-github",
        "@secretlint/secretlint-rule-no-dotenv",
        "@secretlint/secretlint-rule-no-homedir",
        "@secretlint/secretlint-rule-npm",
        "@secretlint/secretlint-rule-openai",
        "@secretlint/secretlint-rule-pattern",
        "@secretlint/secretlint-rule-preset-recommend",
        "@secretlint/secretlint-rule-privatekey",
        "@secretlint/secretlint-rule-secp256k1-privatekey",
        "@stylelint.*",
        "@types.*",
        "eslint.*",
        "madge",
        "postcss.*",
        "remark.*",
        "stylelint.*",
        "ts.*",
        "type.*",
        "unified",

        // Items flagged by knip report (ignored to suppress false-positives / repo-local tools)
        "clsx",
        "react-github-btn",
        "actionlint",
        "commitlint",
        "commitlint-config-gitmoji",
        "fast-check",
        "gitleaks-secret-scanner",
        "htmlhint",
        "leasot",
        "markdown-link-check",
        "rehype-katex",
        "sloc",
        "storybook",
        "yamllint-js",
        "react",
    ],
    ignoreExportsUsedInFile: {
        interface: true,
        type: true,
    },
    includeEntryExports: false,
    project: [],
    rules: {
        binaries: "error",
        catalog: "error",
        dependencies: "error",
        devDependencies: "error",
        duplicates: "error",
        enumMembers: "warn",
        exports: "warn",
        files: "error",
        namespaceMembers: "warn",
        nsExports: "warn",
        nsTypes: "warn",
        optionalPeerDependencies: "error",
        types: "warn",
        unlisted: "error",
        unresolved: "error",
    },
    workspaces: {
        ".": {
            entry: [
                ".secretlintrc.cjs",
                "plugin.d.mts",
                "plugin.mjs",
                "scripts/**/*.{mjs,ts}",
                "src/plugin.ts",
                "src/utils/http-client/worker.ts",
                "stryker.config.mjs",
                "test/**/*.{mjs,ts}",
                "vitest.stryker.config.ts",
            ],
            project: [
                ".secretlintrc.cjs",
                "*.config.{js,mjs,ts}",
                "plugin.d.mts",
                "plugin.mjs",
                "scripts/**/*.{js,mjs,ts}",
                "src/**/*.{js,jsx,mjs,ts,tsx}",
                "stryker.config.mjs",
                "test/**/*.{js,mjs,ts,tsx}",
                "!test/fixtures/**",
                "vitest.stryker.config.ts",
            ],
        },
        "docs/docusaurus": {
            entry: ["docusaurus.config.ts", "src/**/*.{ts,tsx}"],
            project: [
                "*.{js,mjs,ts}",
                "src/**/*.{js,jsx,mjs,ts,tsx}",
                "typedoc-plugins/*.{mjs,mts}",
            ],
        },
    },
};

export default knipConfig;
