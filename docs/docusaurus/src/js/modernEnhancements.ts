const isExternalDocumentationLink = (link: HTMLAnchorElement): boolean =>
    link.hostname.length > 0 && link.hostname !== globalThis.location.hostname;

const markExternalDocumentationLinks = (): void => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>(
        ".markdown a[href]"
    )) {
        if (!isExternalDocumentationLink(link)) {
            continue;
        }

        link.rel = "noopener noreferrer";
    }
};

if (globalThis.window !== undefined) {
    globalThis.addEventListener(
        "DOMContentLoaded",
        markExternalDocumentationLinks,
        {
            once: true,
        }
    );
}
