const isExternalDocumentationLink = (
    link: Readonly<HTMLAnchorElement>
): boolean =>
    link.hostname.length > 0 && link.hostname !== globalThis.location.hostname;

/**
 * Marks external documentation links as safe opener-isolated links.
 */
export const markExternalDocumentationLinks = (): void => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>(
        ".markdown a[href]"
    )) {
        if (isExternalDocumentationLink(link)) {
            link.rel = "noopener noreferrer";
        }
    }
};

const domContentLoadedListener = new AbortController();

if (
    typeof document !== "undefined" &&
    typeof globalThis.addEventListener === "function"
) {
    globalThis.addEventListener(
        "DOMContentLoaded",
        markExternalDocumentationLinks,
        {
            once: true,
            signal: domContentLoadedListener.signal,
        }
    );
}
