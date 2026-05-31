// @ts-check

/*
 * TypeDoc renderer plugin: prefix bare intra-doc Markdown file links with `./`.
 *
 * Docusaurus only rewrites Markdown links to other doc files when they are explicit file paths
 * (typically starting with `./` or `../`).
 *
 * TypeDoc's markdown output frequently contains links like:
 *   - `electron/Foo/index.md`
 *   - `shared/bar/Baz.md`
 *
 * Without the leading `./`, Docusaurus treats those as URL paths, cannot resolve them to files,
 * and reports them as broken/unresolved.
 */

import { PageEvent } from "typedoc";

import { prefixBareMarkdownFileLinksInMarkdown } from "./prefix-doc-links-core.mjs";

/**
 * TypeDoc plugin entrypoint.
 *
 * @param {import("typedoc").Application} app
 */
export function load(app) {
    app.renderer.on(PageEvent.END, onPageEnd);
}

/**
 * Renderer hook: runs after a page has been rendered.
 *
 * @param {import("typedoc").PageEvent} page
 */
function onPageEnd(page) {
    if (typeof page.contents !== "string") {
        return;
    }

    // Markdown output only.
    if (!page.url.endsWith(".md") && !page.url.endsWith(".mdx")) {
        return;
    }

    page.contents = unlinkOmittedPluginTypeAliasLinks(
        prefixBareMarkdownFileLinksInMarkdown(page.contents)
    );
}

/**
 * TypeDoc indexes this exported type alias but does not reliably emit a
 * standalone page for it because it intersects an external `ESLint.Plugin`
 * contract with the package-specific config shape. Keep the generated API docs
 * link-clean by rendering references to that omitted page as plain text.
 *
 * @param {string} input
 */
function unlinkOmittedPluginTypeAliasLinks(input) {
    return input
        .replaceAll(
            "[JsonSchemaValidatorPlugin](./type-aliases/JsonSchemaValidatorPlugin.md)",
            "JsonSchemaValidatorPlugin"
        )
        .replaceAll(
            "[`JsonSchemaValidatorPlugin`](../type-aliases/JsonSchemaValidatorPlugin.md)",
            "`JsonSchemaValidatorPlugin`"
        );
}
