import { Linter, type RuleTester } from "eslint";
import * as espree from "espree";
import * as jsoncESLintParser from "jsonc-eslint-parser";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";
import * as tomlESLintParser from "toml-eslint-parser";
import { safeCastTo } from "ts-extras";
import * as vueESLintParser from "vue-eslint-parser";
import * as yamlESLintParser from "yaml-eslint-parser";

import plugin from "../../src/plugin";

type FixtureConfig = Partial<RuleTester.InvalidTestCase> &
    Partial<RuleTester.ValidTestCase> & {
        code?: string;
        filename?: string;
        options?: unknown[];
    };

type LoadedInvalidTestCase = RuleTester.InvalidTestCase & {
    code: string;
    filename: string;
    options?: unknown[];
};

type LoadedValidTestCase = RuleTester.ValidTestCase & {
    code: string;
    filename: string;
    options?: unknown[];
};

const INPUT_FILE_PATTERN = /input\.(?:js|json5?|toml|vue|ya?ml)$/v;
const INPUT_REQUIREMENTS_PATTERN = /input\.\w+$/v;
const INLINE_HASH_COMMENT_PATTERN = /^#(?<config>[^\n]+)\n/v;
const INLINE_BLOCK_COMMENT_PATTERN = /^\/\*(?<config>.*?)\*\//v;
const INLINE_HTML_COMMENT_PATTERN = /^<!--(?<config>.*?)-->/sv;

/**
 * Load test cases
 */
export function loadTestCases(
    ruleName: string,
    _options?: unknown,
    additionals?: {
        invalid?: RuleTester.InvalidTestCase[];
        valid?: (RuleTester.ValidTestCase | string)[];
    }
): {
    invalid: RuleTester.InvalidTestCase[];
    valid: RuleTester.ValidTestCase[];
} {
    const validFixtureRoot = path.resolve(
        // eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
        fileURLToPath(new URL(".", import.meta.url)),
        `../fixtures/rules/${ruleName}/valid/`
    );
    const invalidFixtureRoot = path.resolve(
        // eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
        fileURLToPath(new URL(".", import.meta.url)),
        `../fixtures/rules/${ruleName}/invalid/`
    );

    const valid = listupInput(validFixtureRoot).map((inputFile) =>
        safeCastTo<RuleTester.ValidTestCase>(getConfig(ruleName, inputFile))
    );

    const invalid: RuleTester.InvalidTestCase[] = listupInput(
        invalidFixtureRoot
    ).map((inputFile) => {
        const config = getConfig(ruleName, inputFile);
        const errorFile = inputFile.replace(INPUT_FILE_PATTERN, "errors.json");
        let errors: RuleTester.InvalidTestCase["errors"];
        try {
            errors = parseJsonValue(
                fs.readFileSync(errorFile, "utf8")
            ) as RuleTester.InvalidTestCase["errors"];
        } catch {
            writeFixtures(ruleName, inputFile);
            errors = parseJsonValue(
                fs.readFileSync(errorFile, "utf8")
            ) as RuleTester.InvalidTestCase["errors"];
        }

        return {
            ...config,
            errors,
        } satisfies LoadedInvalidTestCase;
    });

    if (additionals !== undefined) {
        if (additionals.valid !== undefined) {
            valid.push(...additionals.valid.map(normalizeValidTestCase));
        }
        if (additionals.invalid !== undefined) {
            invalid.push(...additionals.invalid);
        }
    }
    for (const test of valid) {
        if (test.code === "") {
            throw new Error(`Empty code: ${test.filename ?? "<inline>"}`);
        }
    }
    for (const test of invalid) {
        if (test.code === "") {
            throw new Error(`Empty code: ${test.filename ?? "<inline>"}`);
        }
    }
    return {
        invalid,
        valid,
    };
}

/**
 * Prevents leading spaces in a multiline template literal from appearing in the
 * resulting string
 */
export function unIndent(strings: readonly string[]): string {
    const templateValue = strings[0];
    if (templateValue === undefined) {
        throw new TypeError("Expected a template string.");
    }
    const lines = templateValue.split("\n");
    const minLineIndent = getMinIndent(lines);

    return lines.map((line) => line.slice(minLineIndent)).join("\n");
}

/**
 * For `code` and `output`
 */
export function unIndentCodeAndOutput([code]: readonly string[]): (
    args: readonly string[]
) => {
    code: string;
    output: string;
} {
    if (code === undefined) {
        throw new TypeError("Expected a code template string.");
    }
    const codeLines = code.split("\n");
    const codeMinLineIndent = getMinIndent(codeLines);

    return ([output]: readonly string[]) => {
        if (output === undefined) {
            throw new TypeError("Expected an output template string.");
        }
        const outputLines = output.split("\n");
        const minLineIndent = Math.min(
            getMinIndent(outputLines),
            codeMinLineIndent
        );

        return {
            code: codeLines.map((line) => line.slice(minLineIndent)).join("\n"),
            output: outputLines
                .map((line) => line.slice(minLineIndent))
                .join("\n"),
        };
    };
}

function getConfig(ruleName: string, inputFile: string): LoadedValidTestCase {
    const filename = inputFile.slice(inputFile.indexOf(ruleName));
    const code0 = fs.readFileSync(inputFile, "utf8");
    let code: string;
    let config: FixtureConfig | undefined;
    let configFile: string = inputFile.replace(
        INPUT_FILE_PATTERN,
        "config.json"
    );
    const isHashComment =
        inputFile.endsWith(".yaml") ||
        inputFile.endsWith(".yml") ||
        inputFile.endsWith(".toml");
    const isBlockComment =
        (!isHashComment && inputFile.endsWith(".json")) ||
        inputFile.endsWith(".json5") ||
        inputFile.endsWith(".js");
    if (!fs.existsSync(configFile)) {
        configFile = path.join(path.dirname(inputFile), "_config.json");
    }
    if (fs.existsSync(configFile)) {
        config = readFixtureConfig(configFile);
    }
    if (config !== undefined) {
        code = prependFixtureFilename(code0, filename, {
            blockComment: isBlockComment,
            hashComment: isHashComment,
        });
        return {
            languageOptions: { parser: getParser(inputFile) },
            ...config,
            code,
            filename: inputFile,
        };
    }
    // Inline config
    const configStr = isHashComment
        ? INLINE_HASH_COMMENT_PATTERN.exec(code0)
        : isBlockComment
          ? INLINE_BLOCK_COMMENT_PATTERN.exec(code0)
          : INLINE_HTML_COMMENT_PATTERN.exec(code0);
    if (configStr === null) {
        fs.writeFileSync(inputFile, `/* {} */\n${code0}`, "utf8");
        throw new Error("missing config");
    }

    const configJson = configStr.groups?.["config"];
    if (configJson === undefined) {
        throw new Error(`missing inline config in @ ${inputFile}`);
    }
    code = replaceInlineFixtureConfig(code0, filename, {
        blockComment: isBlockComment,
        hashComment: isHashComment,
    });
    try {
        config = parseJsonValue(configJson) as FixtureConfig;
    } catch (error: unknown) {
        throw new Error(`Invalid inline config in @ ${inputFile}`, {
            cause: error,
        });
    }

    return {
        languageOptions: { parser: getParser(inputFile) },
        ...config,
        code,
        filename: inputFile,
    };
}

/**
 * Get number of minimum indent
 */
function getMinIndent(lines: readonly string[]): number {
    const lineIndents = lines
        .filter((line) => line.trim())
        .map((line) => {
            const indent = /^ */v.exec(line);
            if (indent === null) {
                return 0;
            }

            return indent[0].length;
        });
    return Math.min(...lineIndents);
}

function getParser(fileName: string):
    | typeof espree
    | typeof jsoncESLintParser
    | typeof tomlESLintParser
    | typeof vueESLintParser
    | typeof yamlESLintParser {
    if (fileName.endsWith(".vue")) {
        return vueESLintParser;
    }
    if (fileName.endsWith(".yaml") || fileName.endsWith(".yml")) {
        return yamlESLintParser;
    }
    if (fileName.endsWith(".toml")) {
        return tomlESLintParser;
    }
    if (fileName.endsWith(".js")) {
        return espree;
    }
    return jsoncESLintParser;
}

function hasUnsupportedRequirements(
    requirements: Record<string, string>
): boolean {
    return Object.entries(requirements).some(([pkgName, pkgVersion]) => {
        const version =
            pkgName === "node" ? process.version : readPackageVersion(pkgName);

        return !semver.satisfies(version, pkgVersion);
    });
}

function isInputFixture(filename: string): boolean {
    return (
        filename.endsWith("input.js") ||
        filename.endsWith("input.json") ||
        filename.endsWith("input.json5") ||
        filename.endsWith("input.yaml") ||
        filename.endsWith("input.yml") ||
        filename.endsWith("input.toml") ||
        filename.endsWith("input.vue")
    );
}

function isSafePackageName(pkgName: string): boolean {
    if (pkgName === "" || path.isAbsolute(pkgName) || pkgName.includes("..")) {
        return false;
    }

    return pkgName
        .split("/")
        .every((segment) => segment !== "" && !segment.startsWith("."));
}

function* itrListupInput(rootDir: string): IterableIterator<string> {
    for (const filename of fs.readdirSync(rootDir)) {
        if (filename.startsWith("_")) {
            continue;
        }

        const abs = path.join(rootDir, filename);
        if (isInputFixture(filename)) {
            const requirementsPath = path.join(
                rootDir,
                filename.replace(
                    INPUT_REQUIREMENTS_PATTERN,
                    "requirements.json"
                )
            );
            const requirements = readRequirements(requirementsPath);

            if (!hasUnsupportedRequirements(requirements)) {
                yield abs;
            }
        } else if (fs.statSync(abs).isDirectory()) {
            yield* itrListupInput(abs);
        }
    }
}

function listupInput(rootDir: string): string[] {
    return [...itrListupInput(rootDir)];
}

function normalizeValidTestCase(
    testCase: RuleTester.ValidTestCase | string
): RuleTester.ValidTestCase {
    return typeof testCase === "string" ? { code: testCase } : testCase;
}

function parseJsonValue(text: string): unknown {
    return JSON.parse(text) as unknown;
}

function prependFixtureFilename(
    code: string,
    filename: string,
    {
        blockComment,
        hashComment,
    }: { blockComment: boolean; hashComment: boolean }
): string {
    if (hashComment) {
        return `# ${filename}\n${code}`;
    }
    if (blockComment) {
        return `/* ${filename} */\n${code}`;
    }
    return `<!--${filename}-->\n${code}`;
}

function readFixtureConfig(configFile: string): FixtureConfig {
    return parseJsonValue(fs.readFileSync(configFile, "utf8")) as FixtureConfig;
}

function readPackageVersion(pkgName: string): string {
    if (!isSafePackageName(pkgName)) {
        throw new Error(`Invalid package requirement name: ${pkgName}`);
    }

    const packageJsonPath = fileURLToPath(
        import.meta.resolve(`${pkgName}/package.json`)
    );
    const packageJson = parseJsonValue(
        fs.readFileSync(packageJsonPath, "utf8")
    ) as {
        version?: unknown;
    };

    if (typeof packageJson.version !== "string") {
        throw new TypeError(`Package ${pkgName} does not expose a version.`);
    }

    return packageJson.version;
}

function readRequirements(requirementsPath: string): Record<string, string> {
    if (!fs.existsSync(requirementsPath)) {
        return {};
    }

    return parseJsonValue(fs.readFileSync(requirementsPath, "utf8")) as Record<
        string,
        string
    >;
}

function replaceInlineFixtureConfig(
    code: string,
    filename: string,
    {
        blockComment,
        hashComment,
    }: { blockComment: boolean; hashComment: boolean }
): string {
    if (hashComment) {
        return code.replace(INLINE_HASH_COMMENT_PATTERN, `# ${filename}\n`);
    }
    if (blockComment) {
        return code.replace(INLINE_BLOCK_COMMENT_PATTERN, `# ${filename}\n`);
    }
    return code.replace(INLINE_HTML_COMMENT_PATTERN, `<!--${filename}-->`);
}

function writeFixtures(
    ruleName: string,
    inputFile: string,
    { force }: { force?: boolean } = {}
) {
    const linter = new Linter();
    const errorFile = inputFile.replace(INPUT_FILE_PATTERN, "errors.json");

    const config = getConfig(ruleName, inputFile);

    const linterConfig = safeCastTo<Linter.Config>({
        files: [`**/*${path.extname(config.filename)}`],
        languageOptions: {
            ecmaVersion: 2020,
            parser: getParser(inputFile),
            sourceType: "module",
        },
        plugins: {
            "my-eslint-plugin": plugin,
        },
        rules: {
            [`my-eslint-plugin/${ruleName}`]: [
                "error",
                ...(config.options ?? []),
            ],
        },
    });

    const result = linter.verify(config.code, linterConfig, config.filename);
    if ((force ?? false) || !fs.existsSync(errorFile)) {
        fs.writeFileSync(
            errorFile,
            `${JSON.stringify(
                result.map((m) => ({
                    column: m.column,
                    endColumn: m.endColumn,
                    endLine: m.endLine,
                    line: m.line,
                    message: m.message,
                })),
                null,
                4
            )}\n`.replaceAll("my-eslint-plugin/", ""),
            "utf8"
        );
    }
}
