import { execSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { gunzipSync } from "node:zlib";

import { checkPackage, Package } from "@arethetypeswrong/core";
import { getExitCode } from "@arethetypeswrong/cli/internal/getExitCode";

const textDecoder = new TextDecoder();
const blockSize = 512;

/**
 * @param {Uint8Array} header
 * @param {number} start
 * @param {number} end
 * @returns {number}
 */
const parseOctalSize = (header, start, end) => {
  const raw = textDecoder
    .decode(header.subarray(start, end))
    .replace(/\0.*$/u, "")
    .trim();

  return raw.length === 0 ? 0 : Number.parseInt(raw, 8);
};

/**
 * @param {Uint8Array} tarballData
 * @returns {{ data: Uint8Array; filename: string }[]}
 */
const parseTarball = (tarballData) => {
  const tarData = gunzipSync(tarballData);
  const entries = [];

  for (let offset = 0; offset + blockSize <= tarData.length; ) {
    const header = tarData.subarray(offset, offset + blockSize);

    if (header.every((byte) => byte === 0)) {
      break;
    }

    const name = textDecoder
      .decode(header.subarray(0, 100))
      .replace(/\0.*$/u, "");
    const prefix = textDecoder
      .decode(header.subarray(345, 500))
      .replace(/\0.*$/u, "");
    const filename = prefix.length > 0 ? `${prefix}/${name}` : name;
    const size = parseOctalSize(header, 124, 136);
    const typeflag = String.fromCharCode(header[156] ?? 0);
    const dataStart = offset + blockSize;
    const dataEnd = dataStart + size;

    if (typeflag === "0" || typeflag === "\0") {
      entries.push({
        data: tarData.subarray(dataStart, dataEnd),
        filename,
      });
    }

    offset = dataStart + Math.ceil(size / blockSize) * blockSize;
  }

  return entries;
};

/**
 * @param {string} tgzPath
 * @returns {Promise<Package>}
 */
const createPackageFromNpmPack = async (tgzPath) => {
  const entries = parseTarball(await readFile(tgzPath));
  const firstEntry = entries[0];

  if (!firstEntry) {
    throw new Error(`Package tarball is empty: ${tgzPath}`);
  }

  const packagePrefix = firstEntry.filename.slice(
    0,
    firstEntry.filename.indexOf("/") + 1,
  );
  const packageJsonEntry = entries.find(
    (entry) => entry.filename === `${packagePrefix}package.json`,
  );

  if (!packageJsonEntry) {
    throw new Error(`Package tarball is missing package.json: ${tgzPath}`);
  }

  const packageJson = /** @type {{ name: string; version: string }} */ (
    JSON.parse(textDecoder.decode(packageJsonEntry.data))
  );
  /** @type {Record<string, string | Uint8Array>} */
  const files = {};

  for (const entry of entries) {
    files[
      `/node_modules/${packageJson.name}/${entry.filename.slice(
        packagePrefix.length,
      )}`
    ] = entry.data;
  }

  return new Package(files, packageJson.name, packageJson.version);
};

const packOutput = execSync("npm pack --json", {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
const [packResult] = JSON.parse(packOutput);

if (!packResult?.filename) {
  throw new Error("npm pack did not report a tarball filename.");
}

const tgzPath = join(process.cwd(), basename(packResult.filename));

try {
  const packageData = await createPackageFromNpmPack(tgzPath);
  const analysis = await checkPackage(packageData);
  const exitCode = getExitCode(analysis, { ignoreRules: [] });

  if (exitCode === 0) {
    console.log("ATTW package check passed.");
  } else if (analysis.types) {
    console.error(JSON.stringify(analysis.problems, null, 2));
  } else {
    console.error("ATTW package check failed before type analysis completed.");
  }

  process.exitCode = exitCode;
} finally {
  await rm(tgzPath, { force: true });
}
