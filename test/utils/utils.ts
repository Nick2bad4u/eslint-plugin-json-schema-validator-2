import type { RuleTester } from "eslint";

import { Linter } from "eslint";
import * as espree from "espree";
import * as jsoncESLintParser from "jsonc-eslint-parser";
/* globals process, require -- test */
import fs from "node:fs";
import path from "node:path";
import semver from "semver";
import * as tomlESLintParser from "toml-eslint-parser";
import * as vueESLintParser from "vue-eslint-parser";
import * as yamlESLintParser from "yaml-eslint-parser";

import plugin from "../../src/index.ts";

/**
 * Load test cases
 */
export function loadTestCases(
  ruleName: string,
  _options?: any,
  additionals?: {
    invalid?: RuleTester.InvalidTestCase[];
    valid?: (RuleTester.ValidTestCase | string)[];
  },
): {
  invalid: RuleTester.InvalidTestCase[];
  valid: RuleTester.ValidTestCase[];
} {
  const validFixtureRoot = path.resolve(
    import.meta.dirname,
    `../fixtures/rules/${ruleName}/valid/`,
  );
  const invalidFixtureRoot = path.resolve(
    import.meta.dirname,
    `../fixtures/rules/${ruleName}/invalid/`,
  );

  const valid = listupInput(validFixtureRoot).map((inputFile) =>
    getConfig(ruleName, inputFile),
  );

  const invalid = listupInput(invalidFixtureRoot).map((inputFile) => {
    const config = getConfig(ruleName, inputFile);
    const errorFile = inputFile.replace(
      /input\.(?:js|json5?|toml|vue|ya?ml)$/v,
      "errors.json",
    );
    let errors;
    try {
      // WriteFixtures(ruleName, inputFile, { force: true });
      errors = fs.readFileSync(errorFile, "utf8");
    } catch {
      writeFixtures(ruleName, inputFile);
      errors = fs.readFileSync(errorFile, "utf8");
    }
    config.errors = JSON.parse(errors);

    return config;
  });

  if (additionals) {
    if (additionals.valid) {
      valid.push(...additionals.valid);
    }
    if (additionals.invalid) {
      invalid.push(...additionals.invalid);
    }
  }
  for (const test of valid) {
    if (!test.code) {
      throw new Error(`Empty code: ${test.filename}`);
    }
  }
  for (const test of invalid) {
    if (!test.code) {
      throw new Error(`Empty code: ${test.filename}`);
    }
  }
  return {
    invalid,
    valid,
  };
}

/**
 * Prevents leading spaces in a multiline template literal from appearing in the resulting string
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
  args: readonly string[],
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
      codeMinLineIndent,
    );

    return {
      code: codeLines.map((line) => line.slice(minLineIndent)).join("\n"),
      output: outputLines.map((line) => line.slice(minLineIndent)).join("\n"),
    };
  };
}


function getConfig(ruleName: string, inputFile: string) {
  const filename = inputFile.slice(inputFile.indexOf(ruleName));
  const code0 = fs.readFileSync(inputFile, "utf8");
  let code, config;
  let configFile: string = inputFile.replace(
    /input\.(?:js|json5?|toml|vue|ya?ml)$/v,
    "config.json",
  );
  const hashComment =
    inputFile.endsWith(".yaml") ||
    inputFile.endsWith(".yml") ||
    inputFile.endsWith(".toml");
  const blockComment =
    (!hashComment && inputFile.endsWith(".json")) ||
    inputFile.endsWith(".json5") ||
    inputFile.endsWith(".js");
  if (!fs.existsSync(configFile)) {
    configFile = path.join(path.dirname(inputFile), "_config.json");
  }
  if (fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile, "utf8"));
  }
  if (config && typeof config === "object") {
    code = hashComment
      ? `# ${filename}\n${code0}`
      : blockComment
        ? `/* ${filename} */\n${code0}`
        : `<!--${filename}-->\n${code0}`;
    return {
      languageOptions: { parser: getParser(inputFile) },
      ...config,
      code, filename: inputFile,
    };
  }
  // Inline config
  const configStr = hashComment
    ? /^#([^\n]+)\n/v.exec(code0)
    : blockComment
      ? /^\/\*(.*?)\*\//v.exec(code0)
      : /^<!--(.*?)-->/v.exec(code0);
  if (configStr) {
    const configJson = configStr[1];
    if (configJson === undefined) {
      throw new Error(`missing inline config in @ ${inputFile}`);
    }
    code = hashComment
      ? code0.replace(/^#([^\n]+)\n/v, `# ${filename}\n`)
      : blockComment
        ? code0.replace(/^\/\*(.*?)\*\//v, `# ${filename}\n`)
        : code0.replace(/^<!--(.*?)-->/v, `<!--${filename}-->`);
    try {
      config = JSON.parse(configJson);
    } catch (error: any) {
      throw new Error(`${error.message} in @ ${inputFile}`);
    }
  } else {
    fs.writeFileSync(inputFile, `/* {} */\n${code0}`, "utf8");
    throw new Error("missing config");
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
function getMinIndent(lines: string[]) {
  const lineIndents = lines
    .filter((line) => line.trim())
    .map((line) => / */v.exec(line)![0].length);
  return Math.min(...lineIndents);
}

function getParser(fileName: string) {
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

function* itrListupInput(rootDir: string): IterableIterator<string> {
  for (const filename of fs.readdirSync(rootDir)) {
    if (filename.startsWith("_")) {
      // Ignore
      continue;
    }
    const abs = path.join(rootDir, filename);
    if (
      filename.endsWith("input.js") ||
      filename.endsWith("input.json") ||
      filename.endsWith("input.json5") ||
      filename.endsWith("input.yaml") ||
      filename.endsWith("input.yml") ||
      filename.endsWith("input.toml") ||
      filename.endsWith("input.vue")
    ) {
      const requirementsPath = path.join(
        rootDir,
        filename.replace(/input\.\w+$/v, "requirements.json"),
      );
      const requirements = fs.existsSync(requirementsPath)
        ? JSON.parse(fs.readFileSync(requirementsPath, "utf8"))
        : {};

      if (
        Object.entries(requirements).some(([pkgName, pkgVersion]) => {
          const version =
            pkgName === "node"
              ? process.version
              : // eslint-disable-next-line @typescript-eslint/no-require-imports -- test
                require(`${pkgName}/package.json`).version;
          return !semver.satisfies(version, pkgVersion as string);
        })
      ) {
        continue;
      }
      yield abs;
    } else if (fs.statSync(abs).isDirectory()) {
      yield* itrListupInput(abs);
    }
  }
}

function listupInput(rootDir: string) {
  return [...itrListupInput(rootDir)];
}

function writeFixtures(
  ruleName: string,
  inputFile: string,
  { force }: { force?: boolean } = {},
) {
  const linter = new Linter();
  const errorFile = inputFile.replace(
    /input\.(?:js|json5?|toml|vue|ya?ml)$/v,
    "errors.json",
  );

  const config = getConfig(ruleName, inputFile);

  const result = linter.verify(
    config.code,
    {
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
        [`my-eslint-plugin/${ruleName}`]: ["error", ...(config.options || [])],
      },
    } as any,
    config.filename,
  );
  if (force || !fs.existsSync(errorFile)) {
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
        4,
      )}\n`.replaceAll('my-eslint-plugin/', ""),
      "utf8",
    );
  }
}
