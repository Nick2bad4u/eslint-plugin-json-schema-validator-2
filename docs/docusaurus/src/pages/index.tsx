import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";

import { GitHubStats } from "../components/git-hub-stats";
import styles from "./index.module.css";

interface HeroBadge {
    readonly description: string;
    readonly label: string;
}

interface HeroStat {
    readonly description: string;
    readonly headline: string;
}

interface HomeCard {
    readonly accent: "blue" | "green" | "pink";
    readonly description: string;
    readonly title: string;
    readonly to: string;
}

const packageName = "eslint-plugin-json-schema-validator-2";
const repositorySlug = `Nick2bad4u/${packageName}`;
const homepageDescription =
    "Validate JSON, JSONC, JSON5, YAML, TOML, JavaScript exports, Vue custom blocks, and Markdown frontmatter with JSON Schema inside ESLint.";
const homepageKeywords = `${packageName}, eslint plugin, json schema, schemastore, yaml, toml, markdown frontmatter, flat config`;
const homepageStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    codeRepository: `https://github.com/${repositorySlug}`,
    description: homepageDescription,
    image: `https://nick2bad4u.github.io/${packageName}/img/logo.png`,
    license: `https://github.com/${repositorySlug}/blob/main/LICENSE`,
    name: packageName,
    programmingLanguage: "TypeScript",
    runtimePlatform: "Node.js",
    url: `https://nick2bad4u.github.io/${packageName}/`,
} as const;
const homepageSocialImageUrl = `https://nick2bad4u.github.io/${packageName}/img/logo.png`;

const heroBadges = [
    {
        description:
            "Flat config presets for source files, data files, Vue blocks, and Markdown frontmatter.",
        label: "ESLint v9 and v10",
    },
    {
        description:
            "Schema discovery supports inline $schema values, YAML language-server comments, and SchemaStore.",
        label: "Schema discovery",
    },
    {
        description:
            "Standard Ajv formats are enabled by default, with cache controls for catalog lookups.",
        label: "Production validation",
    },
] as const satisfies readonly HeroBadge[];

const heroStats = [
    {
        description:
            "JSON Schema validation runs through the same rule for all supported parsers.",
        headline: "6 data dialects",
    },
    {
        description:
            "The frontmatter processor keeps Markdown support outside the no-invalid rule.",
        headline: "Processor based",
    },
    {
        description:
            "Use reportMode to keep full Ajv output or focus on the deepest actionable errors.",
        headline: "Specific diagnostics",
    },
] as const satisfies readonly HeroStat[];

const homeCards = [
    {
        accent: "blue",
        description:
            "Install the plugin, enable the flat config, and validate JSON-like data files during normal ESLint runs.",
        title: "Get Started",
        to: "/docs/rules/getting-started",
    },
    {
        accent: "green",
        description:
            "Configure schemas explicitly, through $schema fields, with YAML language-server comments, or from SchemaStore.",
        title: "Schema Sources",
        to: "/docs/rules/no-invalid",
    },
    {
        accent: "pink",
        description:
            "Use the frontmatter preset for Markdown, MDX, and MDC files without adding markdown parsing complexity to the rule.",
        title: "Frontmatter",
        to: "/docs/getting-started",
    },
] as const satisfies readonly HomeCard[];

const getStyle = (name: keyof typeof styles): string => styles[name] ?? "";

const cardAccentClassNames = {
    blue: getStyle("cardBlue"),
    green: getStyle("cardGreen"),
    pink: getStyle("cardPink"),
} as const satisfies Record<HomeCard["accent"], string>;

/**
 * Render the Docusaurus landing page for the documentation site.
 */
export default function Home(): React.JSX.Element {
    const logoSrc = useBaseUrl("/img/logo.svg");

    return (
        <Layout description={homepageDescription} title={packageName}>
            <Head>
                <meta content={homepageKeywords} name="keywords" />
                <meta content={homepageSocialImageUrl} property="og:image" />
                <meta content="summary_large_image" name="twitter:card" />
                <meta content={homepageSocialImageUrl} name="twitter:image" />
                <script type="application/ld+json">
                    {JSON.stringify(homepageStructuredData)}
                </script>
            </Head>

            <header className={styles["heroBanner"]}>
                <div className={`container ${getStyle("heroContent")}`}>
                    <div className={getStyle("heroGrid")}>
                        <div>
                            <p className={styles["heroKicker"]}>
                                JSON Schema validation for ESLint flat config
                            </p>
                            <Heading as="h1" className={styles["heroTitle"]}>
                                {packageName}
                            </Heading>
                            <p className={styles["heroSubtitle"]}>
                                Validate data files, source-file schema exports,
                                Vue custom blocks, and Markdown frontmatter with
                                Ajv-backed JSON Schema checks that fit normal
                                ESLint workflows.
                            </p>

                            <div className={styles["heroBadgeRow"]}>
                                {heroBadges.map((badge) => (
                                    <article
                                        className={styles["heroBadge"]}
                                        key={badge.label}
                                    >
                                        <p
                                            className={
                                                styles["heroBadgeLabel"]
                                            }
                                        >
                                            {badge.label}
                                        </p>
                                        <p
                                            className={
                                                styles[
                                                    "heroBadgeDescription"
                                                ]
                                            }
                                        >
                                            {badge.description}
                                        </p>
                                    </article>
                                ))}
                            </div>

                            <div className={styles["heroActions"]}>
                                <Link
                                    className={`button button--lg ${getStyle("heroActionButton")} ${getStyle("heroActionPrimary")}`}
                                    to="/docs/rules/overview"
                                >
                                    Start with Overview
                                </Link>
                                <Link
                                    className={`button button--lg ${getStyle("heroActionButton")} ${getStyle("heroActionSecondary")}`}
                                    to="/docs/rules/no-invalid"
                                >
                                    Open Rule Docs
                                </Link>
                            </div>
                        </div>

                        <aside
                            aria-label={`${packageName} package overview`}
                            className={styles["heroPanel"]}
                        >
                            <img
                                alt={`${packageName} logo`}
                                className={styles["heroPanelLogo"]}
                                decoding="async"
                                height="240"
                                loading="eager"
                                src={logoSrc}
                                width="240"
                            />
                            <div className={styles["heroPanelText"]}>
                                <p className={styles["heroPanelKicker"]}>
                                    Powered by Ajv
                                </p>
                                <p className={styles["heroPanelTitle"]}>
                                    Formats, SchemaStore, cache controls, and
                                    focused diagnostics.
                                </p>
                            </div>
                        </aside>
                    </div>

                    <GitHubStats className={getStyle("heroLiveBadges")} />

                    <div className={styles["heroStats"]}>
                        {heroStats.map((stat) => (
                            <article
                                className={styles["heroStatCard"]}
                                key={stat.headline}
                            >
                                <p className={styles["heroStatHeading"]}>
                                    {stat.headline}
                                </p>
                                <p className={styles["heroStatDescription"]}>
                                    {stat.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </header>

            <main className={styles["mainContent"]}>
                <section className="container">
                    <div className={styles["cardGrid"]}>
                        {homeCards.map((card) => (
                            <article
                                className={`${getStyle("card")} ${cardAccentClassNames[card.accent]}`}
                                key={card.title}
                            >
                                <div className={styles["cardHeader"]}>
                                    <span
                                        aria-hidden="true"
                                        className={styles["cardAccent"]}
                                    />
                                    <Heading
                                        as="h2"
                                        className={styles["cardTitle"]}
                                    >
                                        {card.title}
                                    </Heading>
                                </div>
                                <p className={styles["cardDescription"]}>
                                    {card.description}
                                </p>
                                <Link
                                    className={getStyle("cardLink")}
                                    to={card.to}
                                >
                                    Open section
                                </Link>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
        </Layout>
    );
}
