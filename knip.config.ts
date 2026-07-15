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
        "docs/docusaurus/typedoc-plugins/hash-to-bang-links.mjs",
        "docs/docusaurus/typedoc-plugins/hash-to-bang-links-core.mjs",
        "docs/docusaurus/typedoc-plugins/prefix-doc-links.mjs",
        "docs/docusaurus/typedoc-plugins/prefix-doc-links-core.mjs",
    ],
    ignoreBinaries: [
        "git-cz",
        "open-cli",
        // False-positve Knip thinks knip.config.ts is a binary entry point, but it's actually just a config file.
        "knip.config.ts",
    ],
    ignoreDependencies: [
        ".*prettier.*",
        "@easyops-cn/docusaurus-search-local",
        "@eslint.*",
        "@microsoft/tsdoc-config",
        "@secretlint/secretlint-rule-*",
        "@types.*",
        "eslint.*",
        "postcss.*",
        "remark.*",
        "stylelint.*",
        "ts.*",
        "type.*",

        // Items flagged by knip report (ignored to suppress false-positives / repo-local tools)
        "clsx",
        "react-github-btn",
        "actionlint",
        "commitlint",
        "commitlint-config-gitmoji",
        "fast-check",
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
                "plugin.mjs",
                "scripts/**/*.{mjs,ts}",
                "src/plugin.ts",
                "src/utils/http-client/worker.ts",
                "test/**/*.{mjs,ts}",
                "vitest.stryker.config.ts",
            ],
            project: [
                "*.config.{js,mjs,ts}",
                "scripts/**/*.{js,mjs,ts}",
                "src/**/*.{js,jsx,mjs,ts,tsx}",
                "test/**/*.{js,mjs,ts,tsx}",
                "!test/fixtures/**",
            ],
        },
        "docs/docusaurus": {
            entry: ["src/**/*.{ts,tsx}"],
            project: [
                "*.{js,mjs,ts}",
                "src/**/*.{js,jsx,mjs,ts,tsx}",
                "typedoc-plugins/*.{mjs,mts}",
            ],
        },
    },
};

export default knipConfig;
