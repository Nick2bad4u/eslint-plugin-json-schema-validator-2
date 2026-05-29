import Link from "@docusaurus/Link";

import styles from "./git-hub-stats.module.css";

interface GitHubStatsProps {
    readonly className?: string;
}

interface LiveBadge {
    readonly alt: string;
    readonly href: string;
    readonly src: string;
}

const packageName = "eslint-plugin-json-schema-validator-2";
const repositorySlug = "Nick2bad4u/eslint-plugin-json-schema-validator-2";
const badgeBaseUrl = "https://flat.badgen.net";

const liveBadges = [
    {
        alt: "Codecov",
        href: `https://app.codecov.io/gh/${repositorySlug}`,
        src: `${badgeBaseUrl}/codecov/github/${repositorySlug}?color=purple`,
    },
    {
        alt: "GitHub open issues",
        href: `https://github.com/${repositorySlug}/issues`,
        src: `${badgeBaseUrl}/github/open-issues/${repositorySlug}?color=red`,
    },
    {
        alt: "GitHub stars",
        href: `https://github.com/${repositorySlug}/stargazers`,
        src: `${badgeBaseUrl}/github/stars/${repositorySlug}?color=yellow`,
    },
    {
        alt: "latest GitHub release",
        href: `https://github.com/${repositorySlug}/releases`,
        src: `${badgeBaseUrl}/github/release/${repositorySlug}?color=cyan`,
    },
    {
        alt: "npm license",
        href: `https://github.com/${repositorySlug}/blob/main/LICENSE`,
        src: `${badgeBaseUrl}/npm/license/${packageName}?color=blue`,
    },
    {
        alt: "npm total downloads",
        href: `https://www.npmjs.com/package/${packageName}`,
        src: `${badgeBaseUrl}/npm/dt/${packageName}?color=green`,
    },
] as const satisfies readonly LiveBadge[];

const getStyle = (name: keyof typeof styles): string => styles[name] ?? "";

/**
 * Renders live package and repository badges for the docs site.
 */
export function GitHubStats({
    className = "",
}: GitHubStatsProps): React.JSX.Element {
    const badgeListClassName = [getStyle("liveBadgeList"), className]
        .filter(Boolean)
        .join(" ");

    return (
        <ul className={badgeListClassName}>
            {liveBadges.map((badge) => (
                <li className={getStyle("liveBadgeListItem")} key={badge.src}>
                    <Link
                        className={getStyle("liveBadgeAnchor")}
                        href={badge.href}
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        <img
                            alt={badge.alt}
                            className={getStyle("liveBadgeImage")}
                            decoding="async"
                            loading="lazy"
                            src={badge.src}
                        />
                    </Link>
                </li>
            ))}
        </ul>
    );
}
