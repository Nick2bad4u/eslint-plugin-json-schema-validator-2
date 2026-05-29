import type { Linter } from "eslint";

import base from "./base.js";

/** Flat config that extracts Markdown-family YAML frontmatter for validation. */
const frontmatter: Linter.Config[] = [
    ...base,
    {
        files: [
            "*.md",
            "**/*.md",
            "*.mdx",
            "**/*.mdx",
            "*.mdc",
            "**/*.mdc",
        ],
        processor: "json-schema-validator-2/frontmatter",
    },
];

export default frontmatter;
