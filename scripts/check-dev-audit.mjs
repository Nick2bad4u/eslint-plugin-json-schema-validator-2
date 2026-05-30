#!/usr/bin/env node

import { spawnSync } from "node:child_process";

import pc from "picocolors";

const allowedVulnerabilityNames = new Set([
    "@docusaurus/bundler",
    "@docusaurus/core",
    "@docusaurus/plugin-content-blog",
    "@docusaurus/plugin-content-docs",
    "@docusaurus/plugin-content-pages",
    "@docusaurus/plugin-css-cascade-layers",
    "@docusaurus/plugin-debug",
    "@docusaurus/plugin-google-analytics",
    "@docusaurus/plugin-google-gtag",
    "@docusaurus/plugin-google-tag-manager",
    "@docusaurus/plugin-pwa",
    "@docusaurus/plugin-sitemap",
    "@docusaurus/plugin-svgr",
    "@docusaurus/preset-classic",
    "@docusaurus/theme-classic",
    "@docusaurus/theme-mermaid",
    "@docusaurus/theme-search-algolia",
    "copy-webpack-plugin",
    "css-minimizer-webpack-plugin",
    "serialize-javascript",
    "sockjs",
    "uuid",
    "webpack-dev-server",
]);

const allowedAdvisoryUrls = new Set([
    "https://github.com/advisories/GHSA-5c6j-r48x-rmvq",
    "https://github.com/advisories/GHSA-qj8w-gfj5-8c6v",
    "https://github.com/advisories/GHSA-w5hq-g745-h8pq",
]);

const allowedViaNames = new Set([
    "@docusaurus/bundler",
    "@docusaurus/core",
    "@docusaurus/plugin-content-blog",
    "@docusaurus/plugin-content-docs",
    "@docusaurus/plugin-content-pages",
    "@docusaurus/plugin-css-cascade-layers",
    "@docusaurus/plugin-debug",
    "@docusaurus/plugin-google-analytics",
    "@docusaurus/plugin-google-gtag",
    "@docusaurus/plugin-google-tag-manager",
    "@docusaurus/plugin-sitemap",
    "@docusaurus/plugin-svgr",
    "@docusaurus/theme-classic",
    "@docusaurus/theme-search-algolia",
    "copy-webpack-plugin",
    "css-minimizer-webpack-plugin",
    "serialize-javascript",
    "sockjs",
    "uuid",
    "webpack-dev-server",
]);

/**
 * @param {unknown} value
 *
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * @param {unknown} report
 *
 * @returns {Record<string, unknown>}
 */
const getVulnerabilities = (report) => {
    if (!isRecord(report) || !isRecord(report["vulnerabilities"])) {
        throw new Error("npm audit JSON did not include vulnerabilities.");
    }

    return report["vulnerabilities"];
};

/**
 * @param {string} vulnerabilityName
 * @param {unknown} viaEntry
 *
 * @returns {string | undefined}
 */
const getUnexpectedViaProblem = (vulnerabilityName, viaEntry) => {
    if (typeof viaEntry === "string") {
        return allowedViaNames.has(viaEntry)
            ? undefined
            : `${vulnerabilityName} has unexpected via dependency ${viaEntry}`;
    }

    if (!isRecord(viaEntry)) {
        return `${vulnerabilityName} has malformed via entry`;
    }

    const advisoryUrl = viaEntry["url"];

    if (typeof advisoryUrl !== "string") {
        return `${vulnerabilityName} has advisory metadata without a URL`;
    }

    return allowedAdvisoryUrls.has(advisoryUrl)
        ? undefined
        : `${vulnerabilityName} has unexpected advisory ${advisoryUrl}`;
};

/**
 * @param {Record<string, unknown>} vulnerabilities
 *
 * @returns {string[]}
 */
const collectUnexpectedAuditFindings = (vulnerabilities) => {
    /** @type {string[]} */
    const problems = [];

    for (const [vulnerabilityName, vulnerability] of Object.entries(
        vulnerabilities
    )) {
        if (!allowedVulnerabilityNames.has(vulnerabilityName)) {
            problems.push(`Unexpected vulnerable package ${vulnerabilityName}`);
            continue;
        }

        if (!isRecord(vulnerability) || !Array.isArray(vulnerability["via"])) {
            problems.push(`${vulnerabilityName} has malformed audit metadata`);
            continue;
        }

        for (const viaEntry of vulnerability["via"]) {
            const problem = getUnexpectedViaProblem(
                vulnerabilityName,
                viaEntry
            );

            if (problem !== undefined) {
                problems.push(problem);
            }
        }
    }

    return problems;
};

const npmExecPath = process.env["npm_execpath"];
const auditCommand =
    typeof npmExecPath === "string" && npmExecPath.length > 0
        ? {
              args: [
                  npmExecPath,
                  "audit",
                  "--json",
                  "--audit-level=moderate",
              ],
              command: process.execPath,
          }
        : {
              args: [
                  "audit",
                  "--json",
                  "--audit-level=moderate",
              ],
              command: "npm",
          };
const auditResult = spawnSync(auditCommand.command, auditCommand.args, {
    encoding: "utf8",
    shell: false,
    stdio: [
        "ignore",
        "pipe",
        "pipe",
    ],
});

if (auditResult.error !== undefined) {
    throw auditResult.error;
}

if (auditResult.stdout.trim().length === 0) {
    console.error(pc.red("npm audit did not return JSON output."));
    console.error(auditResult.stderr);
    process.exit(1);
}

const auditReport = JSON.parse(auditResult.stdout);
const vulnerabilities = getVulnerabilities(auditReport);
const unexpectedFindings = collectUnexpectedAuditFindings(vulnerabilities);

if (unexpectedFindings.length > 0) {
    console.error(pc.red("Unexpected npm audit findings detected:"));

    for (const finding of unexpectedFindings) {
        console.error(pc.red(`- ${finding}`));
    }

    process.exit(1);
}

console.log(
    pc.yellow(
        "npm audit contains only the tracked Docusaurus dev-tooling advisory chain."
    )
);
console.log(
    pc.gray(
        "Production dependencies are checked separately by `npm run audit:prod`."
    )
);
