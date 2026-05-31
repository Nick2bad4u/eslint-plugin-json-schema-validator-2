import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars = {
    rules: [
        {
            className: "sb-doc-overview",
            id: "overview",
            label: "Overview",
            type: "doc",
        },
        {
            className: "sb-doc-getting-started",
            id: "getting-started",
            label: "Getting Started",
            type: "doc",
        },
        {
            className: "sb-cat-configs",
            collapsed: false,
            collapsible: true,
            items: [
                {
                    id: "configs/base",
                    label: "🟣 Base",
                    type: "doc",
                },
                {
                    id: "configs/recommended",
                    label: "🟢 Recommended",
                    type: "doc",
                },
                {
                    id: "configs/frontmatter",
                    label: "🔵 Frontmatter",
                    type: "doc",
                },
                {
                    id: "configs/flat-recommended",
                    label: "⚠️ Flat/Recommended [deprecated]",
                    type: "doc",
                },
                {
                    id: "configs/flat-base",
                    label: "⚠️ Flat/Base [deprecated]",
                    type: "doc",
                },
                {
                    id: "configs/flat-frontmatter",
                    label: "⚠️ Flat/Frontmatter [deprecated]",
                    type: "doc",
                },
            ],
            label: "Configs",
            type: "category",
        },
        {
            className: "sb-cat-rules",
            collapsed: false,
            collapsible: true,
            items: [
                {
                    id: "no-invalid",
                    label: "json-schema-validator-2/no-invalid",
                    type: "doc",
                },
            ],
            label: "Rules",
            type: "category",
        },
    ],
} satisfies SidebarsConfig;

export default sidebars;
