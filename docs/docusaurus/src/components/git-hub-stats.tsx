import Link from "@docusaurus/Link";

import styles from "./git-hub-stats.module.css";

const packageName = "eslint-plugin-json-schema-validator-2";
const repositorySlug = "Nick2bad4u/eslint-plugin-json-schema-validator-2";

const getStyle = (name: keyof typeof styles): string => styles[name] ?? "";

/**
 * Renders a compact repository link for the docs site.
 */
export function GitHubStats(): React.JSX.Element {
    return (
        <ul className={getStyle("liveBadgeList")}>
            <li className={getStyle("liveBadgeListItem")}>
                <Link
                    className={getStyle("liveBadgeAnchor")}
                    to={`https://github.com/${repositorySlug}`}
                >
                    {packageName} on GitHub
                </Link>
            </li>
        </ul>
    );
}
