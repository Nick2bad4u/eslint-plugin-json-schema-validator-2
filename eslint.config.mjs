import nickTwoBadFourU from "eslint-config-nick2bad4u";

const baseConfig = nickTwoBadFourU.configs.all;

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...baseConfig,

    {
        files: ["eslint.config.mjs"],
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ["eslint.config.mjs"],
                },
            },
        },
        name: "Local ESLint Config Project Service",
    },

    {
        ignores: ["docs/docusaurus/static/img/coverage.json", "plugin.mjs"],
        name: "Local Generated Documentation Artifacts",
    },
    {
        files: ["docs/docusaurus/src/pages/index.tsx"],
        name: "Local Docusaurus Root Page",
        rules: {
            "canonical/filename-no-index": "off",
        },
    },
    {
        files: ["docs/rules/*.md"],
        name: "Local Docusaurus Rule Documentation Markdown",
        rules: {
            "markdown/no-multiple-h1": "off",
        },
    },
    {
        files: ["docs/docusaurus/docusaurus.config.ts"],
        name: "Local Docusaurus Config Environment",
        rules: {
            "n/no-process-env": "off",
            "unicorn/no-unreadable-new-expression": "off",
            "unicorn/prefer-temporal": "off",
        },
    },
    {
        files: ["docs/docusaurus/**/*.{ts,tsx,mts,cts}"],
        name: "Local Docusaurus Virtual Imports",
        rules: {
            "import-x/no-unresolved": [
                "error",
                {
                    ignore: ["^@docusaurus/", "^@theme/"],
                },
            ],
        },
    },
    {
        files: ["docs/docusaurus/typedoc-plugins/*.mjs"],
        name: "Local TypeDoc Runtime Plugin JavaScript",
        rules: {
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/strict-boolean-expressions": "off",
            "import-x/extensions": "off",
            "unicorn/comment-content": "off",
            "unicorn/no-break-in-nested-loop": "off",
            "unicorn/prefer-includes-over-repeated-comparisons": "off",
            "unicorn/prefer-minimal-ternary": "off",
            "unicorn/prefer-ternary": "off",
        },
    },
    {
        files: [
            "src/**/*.{ts,tsx,mts,cts}",
            "test/**/*.{ts,tsx,mts,cts}",
            "vite.config.ts",
        ],
        name: "Local Parser and Test Implementation Compatibility",
        rules: {
            "unicorn/consistent-compound-words": "off",
            "unicorn/max-nested-calls": "off",
            "unicorn/no-declarations-before-early-exit": "off",
            "unicorn/no-duplicate-loops": "off",
            "unicorn/no-top-level-side-effects": "off",
            "unicorn/no-unreadable-new-expression": "off",
            "unicorn/no-unsafe-string-replacement": "off",
            "unicorn/prefer-array-last-methods": "off",
            // Error.isError is unavailable on the package's supported Node 22 runtime.
            "unicorn/prefer-error-is-error": "off",
            "unicorn/prefer-includes-over-repeated-comparisons": "off",
            "unicorn/prefer-minimal-ternary": "off",
            "unicorn/prefer-number-coercion": "off",
            "unicorn/try-complexity": "off",
        },
    },
    {
        files: ["src/rules/no-invalid.ts"],
        name: "Local AJV Error Path Compatibility",
        rules: {
            // AJV exposes the validation path through a deliberately dynamic boundary.
            "@typescript-eslint/no-unsafe-assignment": "off",
        },
    },
    {
        files: ["test/src/utils/http-client/get-modules/*.{cjs,mjs}"],
        name: "Local Fixture Runtime Module Compatibility",
        rules: {
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "unicorn/comment-content": "off",
        },
    },
    {
        files: ["scripts/check-dev-audit.mjs"],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.js.json"],
                projectService: false,
            },
        },
        name: "Local Runtime Scripts JavaScript",
        rules: {
            "@typescript-eslint/dot-notation": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "n/hashbang": "off",
            "n/no-process-env": "off",
            "n/no-process-exit": "off",
            "n/no-sync": "off",
            "no-console": "off",
            "no-continue": "off",
            "perfectionist/sort-imports": "off",
        },
    },
    {
        files: ["test/src/utils/http-client/get-modules/*.mjs"],
        name: "Local HTTP Client Test Runtime Modules",
        rules: {
            "@typescript-eslint/explicit-module-boundary-types": "off",
        },
    },
    {
        files: ["src/**/*.{ts,tsx,mts,cts}", "test/**/*.{ts,tsx,mts,cts}"],
        name: "Local Mutable Framework Callback Boundaries",
        rules: {
            "@typescript-eslint/prefer-readonly-parameter-types": "off",
        },
    },
    {
        files: ["src/meta.ts", "src/utils/validator-factory.ts"],
        name: "Local Runtime JSON Module Imports",
        rules: {
            "import-x/extensions": "off",
        },
    },
];

export default config;
