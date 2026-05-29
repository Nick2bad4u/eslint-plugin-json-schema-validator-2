import type { Linter } from "eslint";

import { describe, expect, it } from "vitest";

import { frontmatterProcessor } from "../../../src/processors/frontmatter";

function getPostprocess() {
    if (frontmatterProcessor.postprocess === undefined) {
        throw new TypeError(
            "Expected frontmatter processor to define postprocess."
        );
    }
    return frontmatterProcessor.postprocess.bind(frontmatterProcessor);
}

function preprocess(text: string, filename = "docs/example.md") {
    if (frontmatterProcessor.preprocess === undefined) {
        throw new TypeError(
            "Expected frontmatter processor to define preprocess."
        );
    }
    return frontmatterProcessor.preprocess(text, filename);
}

// eslint-disable-next-line test-signal/require-negative-path -- Negative cases are covered by the invalid frontmatter table below.
describe("frontmatter processor", () => {
    it("extracts leading YAML frontmatter into a virtual YAML file", () => {
        expect.assertions(2);

        expect(preprocess("# Demo")).toStrictEqual([]);
        expect(
            preprocess(
                [
                    "---",
                    "title: Demo",
                    "draft: false",
                    "---",
                    "# Demo",
                ].join("\n")
            )
        ).toStrictEqual([
            {
                filename: "docs/example.md.frontmatter.yaml",
                text: "\ntitle: Demo\ndraft: false",
            },
        ]);
    });

    it("preserves CRLF line endings in extracted frontmatter", () => {
        expect.assertions(1);

        expect(
            preprocess(
                [
                    "---",
                    "title: Windows",
                    "draft: true",
                    "---",
                    "# Demo",
                ].join("\r\n"),
                "docs/windows.mdx"
            )
        ).toStrictEqual([
            {
                filename: "docs/windows.mdx.frontmatter.yaml",
                text: "\r\ntitle: Windows\r\ndraft: true",
            },
        ]);
    });

    it("accepts the YAML document end marker as a frontmatter terminator", () => {
        expect.assertions(1);

        expect(
            preprocess(
                [
                    "---",
                    "title: Demo",
                    "...",
                    "Body",
                ].join("\n")
            )
        ).toStrictEqual([
            {
                filename: "docs/example.md.frontmatter.yaml",
                text: "\ntitle: Demo",
            },
        ]);
    });

    it.each([
        ["empty source", ""],
        ["source without leading delimiter", "# Demo\n---\ntitle: Demo\n---"],
        ["missing closing delimiter", "---\ntitle: Demo\n# Demo"],
        ["empty frontmatter", "---\n---\n# Demo"],
    ])("returns no virtual files for %s", (_name, text) => {
        expect.assertions(1);

        expect(preprocess(text)).toStrictEqual([]);
    });

    it("flattens message lists from virtual files", () => {
        expect.assertions(1);

        const messages = [
            [
                {
                    column: 1,
                    line: 2,
                    message: "first",
                    ruleId: "json-schema-validator-2/no-invalid",
                    severity: 2,
                },
            ],
            [
                {
                    column: 3,
                    line: 4,
                    message: "second",
                    ruleId: "json-schema-validator-2/no-invalid",
                    severity: 1,
                },
            ],
        ] satisfies Linter.LintMessage[][];

        expect(getPostprocess()(messages, "docs/example.md")).toStrictEqual(
            messages.flat()
        );
    });

    it("does not advertise autofix support", () => {
        expect.assertions(1);

        expect(frontmatterProcessor.supportsAutofix).toBe(false);
    });
});
