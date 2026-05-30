import type { Options as DocsPluginOptions } from "@docusaurus/plugin-content-docs";
import type * as Preset from "@docusaurus/preset-classic";
import type { Config, PluginModule } from "@docusaurus/types";

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { themes as prismThemes } from "prism-react-renderer";

const environment = globalThis.process.env;
const baseUrl =
    environment["DOCUSAURUS_BASE_URL"] ??
    "/eslint-plugin-json-schema-validator-2/";
const enableExperimentalFaster =
    environment["DOCUSAURUS_ENABLE_EXPERIMENTAL"] === "true";

const organizationName = "Nick2bad4u";
const projectName = "eslint-plugin-json-schema-validator-2";
const packageName = "eslint-plugin-json-schema-validator-2";
const siteOrigin = "https://nick2bad4u.github.io";
const siteUrl = `${siteOrigin}${baseUrl}`;
const siteDescription =
    "ESLint rules that validate JSON, YAML, TOML, JavaScript, and Vue custom-block data with JSON Schema.";
const projectBlogDescription = `Updates and practical guidance for ${packageName}.`;
const projectKeywords =
    "eslint, eslint-plugin, json schema, schemastore, yaml, toml, flat config";
const socialCardImagePath = "img/logo.png";
const socialCardImageUrl = new URL(socialCardImagePath, siteUrl).toString();
const currentYear = new Date().getFullYear().toString();
const modernEnhancementsClientModulePath = fileURLToPath(
    new URL("src/js/modern-enhancements.ts", import.meta.url)
);

const requireFromDocsWorkspace = createRequire(import.meta.url);

const resolveOptionalModule = (moduleSpecifier: string): string | undefined => {
    try {
        return requireFromDocsWorkspace.resolve(moduleSpecifier);
    } catch {
        return undefined;
    }
};

const vscodeLanguageServerTypesEsmEntry = resolveOptionalModule(
    "vscode-languageserver-types/lib/esm/main.js"
);

const getWebpackWarningMessage = (warning: unknown): string | undefined => {
    if (
        typeof warning !== "object" ||
        warning === null ||
        !("message" in warning)
    ) {
        return undefined;
    }

    const { message } = warning;
    return typeof message === "string" ? message : undefined;
};

const suppressKnownWebpackWarningsPlugin: PluginModule = () => ({
    configureWebpack() {
        return {
            ignoreWarnings: [
                (warning: unknown) => {
                    const message = getWebpackWarningMessage(warning);

                    return (
                        message?.includes(
                            "Critical dependency: require function is used in a way in which dependencies cannot be statically extracted"
                        ) === true
                    );
                },
            ],
            resolve: {
                alias:
                    vscodeLanguageServerTypesEsmEntry === undefined
                        ? {}
                        : {
                              "vscode-languageserver-types$":
                                  vscodeLanguageServerTypesEsmEntry,
                              "vscode-languageserver-types/lib/umd/main.js$":
                                  vscodeLanguageServerTypesEsmEntry,
                          },
            },
        };
    },
    name: "suppress-known-webpack-warnings",
});

const futureConfig = {
    ...(enableExperimentalFaster
        ? {
              faster: {
                  mdxCrossCompilerCache: true,
                  rspackBundler: true,
                  rspackPersistentCache: true,
                  ssgWorkerThreads: true,
              },
          }
        : {}),
    v4: {
        fasterByDefault: false,
        mdx1CompatDisabledByDefault: true,
        removeLegacyPostBuildHeadAttribute: true,
        siteStorageNamespacing: true,
        useCssCascadeLayers: false,
    },
} satisfies Config["future"];

const config = {
    baseUrl,
    baseUrlIssueBanner: true,
    clientModules: [modernEnhancementsClientModulePath],
    deploymentBranch: "gh-pages",
    favicon: "img/favicon.ico",
    future: futureConfig,
    headTags: [
        {
            attributes: {
                href: siteOrigin,
                rel: "preconnect",
            },
            tagName: "link",
        },
        {
            attributes: {
                type: "application/ld+json",
            },
            innerHTML: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                description: siteDescription,
                image: socialCardImageUrl,
                name: `${packageName} Documentation`,
                publisher: {
                    "@type": "Person",
                    name: "Nick2bad4u",
                    url: "https://github.com/Nick2bad4u",
                },
                url: siteUrl,
            }),
            tagName: "script",
        },
    ],
    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },
    markdown: {
        anchors: {
            maintainCase: true,
        },
        emoji: true,
        format: "detect",
        mermaid: true,
    },
    onBrokenAnchors: "warn",
    onBrokenLinks: "warn",
    onDuplicateRoutes: "warn",
    organizationName,
    plugins: [
        suppressKnownWebpackWarningsPlugin,
        "docusaurus-plugin-image-zoom",
        [
            "@docusaurus/plugin-pwa",
            {
                debug: process.env["DOCUSAURUS_PWA_DEBUG"] === "true",
                offlineModeActivationStrategies: [
                    "appInstalled",
                    "standalone",
                    "queryString",
                ],
                pwaHead: [
                    {
                        content: "#0b1120",
                        name: "theme-color",
                        tagName: "meta",
                    },
                    {
                        href: "manifest.json",
                        rel: "manifest",
                        tagName: "link",
                    },
                    {
                        href: "img/logo.png",
                        rel: "apple-touch-icon",
                        tagName: "link",
                    },
                ],
            },
        ],
        [
            "@docusaurus/plugin-content-docs",
            {
                editUrl: `https://github.com/${organizationName}/${projectName}/blob/main/docs/`,
                id: "rules",
                path: "../rules",
                routeBasePath: "docs/rules",
                showLastUpdateAuthor: true,
                showLastUpdateTime: true,
                sidebarPath: "./sidebars.rules.ts",
            } satisfies DocsPluginOptions,
        ],
    ],
    presets: [
        [
            "classic",
            {
                blog: {
                    blogDescription: projectBlogDescription,
                    blogSidebarCount: "ALL",
                    blogSidebarTitle: "All posts",
                    blogTitle: `${packageName} Blog`,
                    editUrl: `https://github.com/${organizationName}/${projectName}/blob/main/docs/docusaurus/`,
                    feedOptions: {
                        copyright: `Copyright ${currentYear} Nick2bad4u`,
                        description: projectBlogDescription,
                        language: "en",
                        title: `${packageName} Blog`,
                        type: ["rss", "atom"],
                        xslt: true,
                    },
                    path: "blog",
                    routeBasePath: "blog",
                    showReadingTime: true,
                },
                docs: {
                    breadcrumbs: true,
                    editUrl: `https://github.com/${organizationName}/${projectName}/blob/main/docs/docusaurus/`,
                    path: "site-docs",
                    routeBasePath: "docs",
                    showLastUpdateAuthor: true,
                    showLastUpdateTime: true,
                    sidebarPath: "./sidebars.ts",
                },
                googleTagManager: {
                    containerId: "GTM-T8J6HPLF",
                },
                gtag: {
                    trackingID: "G-18DR1S6R1T",
                },
                pages: {
                    editUrl: `https://github.com/${organizationName}/${projectName}/blob/main/docs/docusaurus/`,
                    path: "src/pages",
                    routeBasePath: "/",
                },
                sitemap: {
                    filename: "sitemap.xml",
                    lastmod: "datetime",
                },
                theme: {
                    customCss: "./src/css/custom.css",
                },
            } satisfies Preset.Options,
        ],
    ],
    projectName,
    staticDirectories: ["static"],
    tagline: siteDescription,
    themeConfig: {
        colorMode: {
            defaultMode: "dark",
            disableSwitch: false,
            respectPrefersColorScheme: true,
        },
        footer: {
            copyright: `Copyright ${currentYear} Nick2bad4u. Built with Docusaurus.`,
            links: [
                {
                    items: [
                        {
                            label: "Overview",
                            to: "/docs/rules/overview",
                        },
                        {
                            label: "Getting Started",
                            to: "/docs/rules/getting-started",
                        },
                        {
                            label: "Rule Reference",
                            to: "/docs/rules/no-invalid",
                        },
                        {
                            label: "API",
                            to: "/docs/developer/api/variables/default",
                        },
                    ],
                    title: "Docs",
                },
                {
                    items: [
                        {
                            href: `https://github.com/${organizationName}/${projectName}`,
                            label: "GitHub",
                        },
                        {
                            href: `https://www.npmjs.com/package/${packageName}`,
                            label: "npm",
                        },
                        {
                            href: "https://json-schema.org/",
                            label: "JSON Schema",
                        },
                        {
                            href: "https://www.schemastore.org/json/",
                            label: "SchemaStore",
                        },
                    ],
                    title: "Project",
                },
            ],
            style: "dark",
        },
        image: socialCardImagePath,
        metadata: [
            {
                content: projectKeywords,
                name: "keywords",
            },
        ],
        navbar: {
            hideOnScroll: true,
            items: [
                {
                    label: "Docs",
                    position: "left",
                    to: "/docs/rules/overview",
                },
                {
                    label: "Rules",
                    position: "left",
                    to: "/docs/rules/no-invalid",
                },
                {
                    href: `https://github.com/${organizationName}/${projectName}`,
                    label: "GitHub",
                    position: "right",
                },
            ],
            logo: {
                alt: `${packageName} logo`,
                src: "img/logo.svg",
            },
            title: packageName,
        },
        prism: {
            additionalLanguages: [
                "bash",
                "json",
                "yaml",
                "typescript",
            ],
            darkTheme: prismThemes.dracula,
            defaultLanguage: "typescript",
            theme: prismThemes.github,
        },
    } satisfies Preset.ThemeConfig,
    themes: ["@docusaurus/theme-mermaid"],
    title: packageName,
    titleDelimiter: "|",
    trailingSlash: true,
    url: siteOrigin,
} satisfies Config;

export default config;
