/**
 * Synchronize or validate the README rules table from built plugin metadata.
 */
// @ts-check

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import builtPlugin from "../dist/plugin.mjs";

const rulesSectionHeading = "## Rules";

const detectLineEnding = (markdown) =>
  markdown.includes("\r\n") ? "\r\n" : "\n";

const normalizeMarkdownLineEndings = (markdown, lineEnding) =>
  markdown.replace(/\r?\n/gv, lineEnding);

const getReadmeRulesSectionBounds = (markdown) => {
  const startOffset = markdown.indexOf(rulesSectionHeading);

  if (startOffset < 0) {
    throw new Error("README.md is missing the '## Rules' section heading.");
  }

  const nextHeadingOffset = markdown.indexOf(
    "\n## ",
    startOffset + rulesSectionHeading.length,
  );

  return {
    endOffset: nextHeadingOffset < 0 ? markdown.length : nextHeadingOffset,
    startOffset,
  };
};

export const extractReadmeRulesSection = (markdown) => {
  const { endOffset, startOffset } = getReadmeRulesSectionBounds(markdown);

  return markdown.slice(startOffset, endOffset);
};

export const normalizeRulesSectionMarkdown = (markdown) =>
  markdown
    .replace(/\r\n/gv, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();

const getRuleFixIndicator = (ruleModule) => {
  const fixable = ruleModule.meta?.fixable === "code";
  const hasSuggestions = ruleModule.meta?.hasSuggestions === true;

  if (fixable && hasSuggestions) {
    return "fix, suggestions";
  }

  if (fixable) {
    return "fix";
  }

  if (hasSuggestions) {
    return "suggestions";
  }

  return "report only";
};

const toRuleTableRow = ([ruleName, ruleModule]) => {
  const docsUrl = ruleModule.meta?.docs?.url;
  const description = ruleModule.meta?.docs?.description ?? "";

  if (typeof docsUrl !== "string" || docsUrl.trim().length === 0) {
    throw new TypeError(`Rule '${ruleName}' is missing meta.docs.url.`);
  }

  return `| [\`${ruleName}\`](${docsUrl}) | ${description} | ${getRuleFixIndicator(ruleModule)} |`;
};

export const generateReadmeRulesSectionFromRules = (rules) => {
  const ruleEntries = Object.entries(rules).toSorted((left, right) =>
    left[0].localeCompare(right[0]),
  );

  return [
    "## Rules",
    "",
    "| Rule | Description | Fix |",
    "| --- | --- | --- |",
    ...ruleEntries.map(toRuleTableRow),
    "",
  ].join("\n");
};

export const syncReadmeRulesTable = async ({ writeChanges }) => {
  const workspaceRoot = resolve(fileURLToPath(import.meta.url), "../..");
  const readmePath = resolve(workspaceRoot, "README.md");
  const readmeText = await readFile(readmePath, "utf8");
  const lineEnding = detectLineEnding(readmeText);

  const { endOffset, startOffset } = getReadmeRulesSectionBounds(readmeText);
  const readmePrefix = readmeText.slice(0, startOffset).trimEnd();
  const readmeSuffix = readmeText.slice(endOffset);
  const generatedRulesSection = generateReadmeRulesSectionFromRules(
    builtPlugin.rules,
  );
  const existingRulesSection = extractReadmeRulesSection(readmeText);

  if (
    normalizeRulesSectionMarkdown(existingRulesSection) ===
    normalizeRulesSectionMarkdown(generatedRulesSection)
  ) {
    return {
      changed: false,
    };
  }

  const nextReadmeText = normalizeMarkdownLineEndings(
    `${readmePrefix}\n\n${generatedRulesSection}${readmeSuffix}`,
    lineEnding,
  );

  if (!writeChanges) {
    return {
      changed: true,
    };
  }

  await writeFile(readmePath, nextReadmeText, "utf8");

  return {
    changed: true,
  };
};

const runCli = async () => {
  const writeChanges = process.argv.includes("--write");
  const result = await syncReadmeRulesTable({ writeChanges });

  if (!result.changed) {
    console.log("README rules table is already synchronized.");

    return;
  }

  if (writeChanges) {
    console.log("README rules table synchronized from plugin metadata.");

    return;
  }

  console.error(
    "README rules table is out of sync. Run: npm run sync:readme-rules-table:write.",
  );
  process.exitCode = 1;
};

if (
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await runCli();
}
