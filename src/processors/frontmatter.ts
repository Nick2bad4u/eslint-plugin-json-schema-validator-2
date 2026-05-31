import type { Linter } from "eslint";

import { arrayFirst, arrayJoin, setHas } from "ts-extras";

import * as packageMeta from "../meta.js";

const YAML_FRONTMATTER_DELIMITER = "---";
const YAML_FRONTMATTER_END_DELIMITERS = new Set(["---", "..."]);

interface ExtractedFrontmatter {
    text: string;
}

/**
 * Processor that extracts leading YAML frontmatter into a virtual YAML file.
 */
export const frontmatterProcessor: Linter.Processor<Linter.ProcessorFile> = {
    meta: {
        name: "json-schema-validator-2/frontmatter",
        version: packageMeta.version,
    },
    postprocess(messageLists) {
        return messageLists.flat();
    },
    preprocess(text, filename) {
        const frontmatter = extractYamlFrontmatter(text);
        if (frontmatter === null) {
            return [];
        }
        return [
            {
                filename: `${filename}.frontmatter.yaml`,
                text: frontmatter.text,
            },
        ];
    },
    supportsAutofix: false,
};

/**
 * Extract leading YAML frontmatter while preserving original line numbers.
 */
function extractYamlFrontmatter(text: string): ExtractedFrontmatter | null {
    const newline = text.includes("\r\n") ? "\r\n" : "\n";
    // eslint-disable-next-line typefest/prefer-ts-extras-string-split -- Frontmatter accepts either LF or CRLF, so this needs a RegExp split.
    const lines = text.split(/\r?\n/v);
    const firstLine = arrayFirst(lines);
    if (firstLine?.trim() !== YAML_FRONTMATTER_DELIMITER) {
        return null;
    }

    const endIndex = lines.findIndex(
        (line, index) =>
            index > 0 && setHas(YAML_FRONTMATTER_END_DELIMITERS, line.trim())
    );
    if (endIndex <= 1) {
        return null;
    }

    const frontmatterLines = lines.slice(1, endIndex);
    return {
        text: arrayJoin(["", ...frontmatterLines], newline),
    };
}
