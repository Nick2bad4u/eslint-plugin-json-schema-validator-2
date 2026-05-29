import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars = {
  rules: [
    {
      id: "overview",
      label: "Overview",
      type: "doc",
    },
    {
      id: "getting-started",
      label: "Getting Started",
      type: "doc",
    },
    {
      collapsed: true,
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
