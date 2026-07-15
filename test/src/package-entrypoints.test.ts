import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const COMMAND_TIMEOUT = 60_000;
const ESLINT_PEER_VERSION = "9.38.0";
const INSTALL_TIMEOUT = 120_000;
const PACKAGE_NAME = "eslint-plugin-json-schema-validator-2";
const PACKAGE_ROOT = fileURLToPath(new URL("../../", import.meta.url));

interface CommandInvocation {
    readonly args: readonly string[];
    readonly command: string;
}

interface CommandResult {
    readonly stderr: string;
    readonly stdout: string;
}

function createCommandEnvironment(): NodeJS.ProcessEnv {
    // eslint-disable-next-line n/no-process-env -- child processes need the current runtime environment without npm policy leakage
    const environment = { ...process.env };
    delete environment["FORCE_COLOR"];
    return environment;
}

function createNpmEnvironment(): NodeJS.ProcessEnv {
    const environment = createCommandEnvironment();
    delete environment["npm_config_allow_scripts"];
    delete environment["NPM_CONFIG_ALLOW_SCRIPTS"];
    return environment;
}

async function executeCommand(
    invocation: CommandInvocation,
    cwd: string,
    environment: NodeJS.ProcessEnv
): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        const child = execFile(
            invocation.command,
            [...invocation.args],
            {
                cwd,
                encoding: "utf8",
                env: environment,
                maxBuffer: 1_000_000,
                shell: false,
                timeout: COMMAND_TIMEOUT,
                windowsHide: true,
            },
            (error, stdout, stderr) => {
                if (error !== null) {
                    reject(
                        new Error(
                            `Command failed: ${invocation.command} ${invocation.args.join(" ")}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
                            { cause: error }
                        )
                    );
                    return;
                }

                resolve({ stderr, stdout });
            }
        );

        if (child.stdin !== null) {
            child.stdin.end();
        }
    });
}

function resolveNpmInvocation(
    args: readonly string[],
    environment: NodeJS.ProcessEnv
): CommandInvocation {
    const configuredNpmExecPath = environment["npm_execpath"];
    const bundledNpmExecPath = path.join(
        path.dirname(process.execPath),
        "node_modules",
        "npm",
        "bin",
        "npm-cli.js"
    );
    const npmExecPath =
        typeof configuredNpmExecPath === "string" &&
        configuredNpmExecPath.length > 0
            ? configuredNpmExecPath
            : existsSync(bundledNpmExecPath)
              ? bundledNpmExecPath
              : undefined;

    if (npmExecPath !== undefined) {
        return {
            args: [npmExecPath, ...args],
            command: process.execPath,
        };
    }
    if (process.platform !== "win32") {
        return { args, command: "npm" };
    }

    throw new Error(
        "Unable to locate npm. Run the test through an npm script or use a Node.js installation that bundles npm."
    );
}

async function runNodeEval(
    source: string,
    cwd: string
): Promise<CommandResult> {
    return executeCommand(
        { args: ["-e", source], command: process.execPath },
        cwd,
        createCommandEnvironment()
    );
}

async function runNpm(
    args: readonly string[],
    cwd: string
): Promise<CommandResult> {
    const environment = createNpmEnvironment();
    return executeCommand(
        resolveNpmInvocation(args, environment),
        cwd,
        environment
    );
}

describe("packaged entrypoints", () => {
    it(
        "loads both package exports from a CommonJS eval process",
        { timeout: INSTALL_TIMEOUT },
        async () => {
            expect.assertions(4);

            const temporaryRoot = await mkdtemp(
                path.join(tmpdir(), `${PACKAGE_NAME}-entrypoints-`)
            );
            const packDirectory = path.join(temporaryRoot, "pack");
            const consumerDirectory = path.join(temporaryRoot, "consumer");

            try {
                await Promise.all([
                    mkdir(packDirectory),
                    mkdir(consumerDirectory),
                ]);
                await writeFile(
                    path.join(consumerDirectory, "package.json"),
                    `${JSON.stringify({ private: true }, null, 2)}\n`,
                    "utf8"
                );

                await runNpm(
                    [
                        "pack",
                        "--ignore-scripts",
                        "--json",
                        "--pack-destination",
                        packDirectory,
                    ],
                    PACKAGE_ROOT
                );

                const tarballFilenames = (await readdir(packDirectory)).filter(
                    (filename) => filename.endsWith(".tgz")
                );
                if (tarballFilenames.length !== 1) {
                    throw new Error(
                        `Expected npm pack to create one tarball, received ${String(tarballFilenames.length)}.`
                    );
                }
                const tarballFilename = tarballFilenames[0];
                if (tarballFilename === undefined) {
                    throw new Error(
                        "npm pack did not create a package tarball."
                    );
                }

                await runNpm(
                    [
                        "install",
                        "--ignore-scripts",
                        "--no-audit",
                        "--no-fund",
                        "--package-lock=false",
                        "--prefer-offline",
                        "--save=false",
                        `eslint@${ESLINT_PEER_VERSION}`,
                        path.join(packDirectory, tarballFilename),
                    ],
                    consumerDirectory
                );

                const importResult = await runNodeEval(
                    `import(${JSON.stringify(PACKAGE_NAME)}).then(() => console.log("passed")).catch((error) => { console.error(error); process.exitCode = 1; });`,
                    consumerDirectory
                );
                const commonJsResult = await runNodeEval(
                    `require(${JSON.stringify(PACKAGE_NAME)}); console.log("passed");`,
                    consumerDirectory
                );

                expect(importResult.stderr).not.toContain("MODULE_NOT_FOUND");
                expect(importResult.stdout.trim()).toBe("passed");
                expect(commonJsResult.stderr).not.toContain("MODULE_NOT_FOUND");
                expect(commonJsResult.stdout.trim()).toBe("passed");
            } finally {
                await rm(temporaryRoot, {
                    force: true,
                    maxRetries: 3,
                    recursive: true,
                    retryDelay: 100,
                });
            }
        }
    );
});
