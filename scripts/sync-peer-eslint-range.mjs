#!/usr/bin/env node

/**
 * Keep `peerDependencies.eslint` aligned with the repository's supported ESLint
 * major versions.
 *
 * Why: dependency update tools may raise the peer dependency's lower bounds to
 * the currently installed ESLint version. The peer range is a support contract,
 * so keep the independently tested ESLint 9 and ESLint 10 ranges explicit.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/**
 * The file path to the package.json file, resolved from the current module's
 * URL. This is used to read and update the package.json file for synchronizing
 * the peer dependency range for eslint.
 *
 * @type {string}
 *
 * @param {string} packageJsonPath - The file path to the package.json file.
 *
 * @see fileURLToPath
 * @see URL
 */
const packageJsonPath = fileURLToPath(
    new URL("../package.json", import.meta.url)
);
/**
 * The supported ESLint peer dependency range.
 *
 * @type {string}
 */
const supportedEslintPeerRange = "^9.0.0 || ^10.0.0";

/**
 * Read and parse package.json.
 *
 * @type {() => Promise<Record<string, unknown>>}
 *
 * @returns {Promise<Record<string, unknown>>}
 *
 * @throws {TypeError} If reading or parsing package.json fails, an error is
 *   thrown with a descriptive message.
 *
 * @see readFile
 * @see fileURLToPath
 */
const readPackageJson = async () => {
    try {
        /** @type {string} */
        const packageJsonContent = await readFile(packageJsonPath, "utf8");
        /** @type {Record<string, unknown>} */
        return JSON.parse(packageJsonContent);
        /** @type {Error} */
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new TypeError(
            `Failed to read package.json at ${packageJsonPath}: ${message}`,
            { cause: error }
        );
    }
};

/**
 * Check whether an unknown runtime value is a non-null object record.
 *
 * @type {(value: unknown) => value is Record<string, unknown>}
 *
 * @param {unknown} value
 *
 * @returns {value is Record<string, unknown>}
 *
 * @throws {TypeError} If the value is not a non-null object, an error is thrown
 *   with a descriptive message.
 */
const isRecord = (value) => typeof value === "object" && value !== null;

const main = async () => {
    /** @type {Record<string, unknown>} */
    const packageJson = await readPackageJson();

    /** @type {unknown} */
    const peerDependencies = packageJson["peerDependencies"];

    if (!isRecord(peerDependencies)) {
        /** @type {string} */
        throw new TypeError(
            "Expected package.json to include object-valued peerDependencies"
        );
    }

    /** @type {string} */
    if (peerDependencies["eslint"] === supportedEslintPeerRange) {
        /** @type {string} */
        console.log(
            `peerDependencies.eslint already aligned: ${supportedEslintPeerRange}`
        );
        /** @type {void} */
        return;
    }

    peerDependencies["eslint"] = supportedEslintPeerRange;
    try {
        /** @type {string} */
        await writeFile(
            /** @type {string} */
            packageJsonPath,
            `${JSON.stringify(packageJson, null, 4)}\n`,
            "utf8"
        );
        /** @type {string} */
        console.log(
            `Updated peerDependencies.eslint to: ${supportedEslintPeerRange}`
        );
    } catch (error) {
        /** @type {Error} */
        throw new TypeError(
            `Failed to write updated package.json with new peerDependencies.eslint: ${error}`,
            { cause: error }
        );
    }
};

/**
 * Execute the synchronization process, handling any errors gracefully. Errors
 * are logged to the console, and the process exits with a non-zero code to
 * indicate failure.
 *
 * @type {() => Promise<void>}
 *
 * @returns {Promise<void>}
 *
 * @throws {Error} If any step of the synchronization process fails, an error is
 *   thrown with a descriptive message.
 * @throws {TypeError} If reading or writing package.json fails, or if the
 *   expected structure of package.json is not met.
 *
 * @see writeFile
 * @see readPackageJson
 * @see isRecord
 * @see main
 */
try {
    await main();
} catch (error) {
    /** @type {Error} */
    console.error("Failed to synchronize peerDependencies.eslint:", error);
    /** @type {number} */
    process.exitCode = 1;
}
