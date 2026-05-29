import pkg from "../package.json" with { type: "json" };

/** Published package name. */
export const name: string = pkg.name;

/** Published package version. */
export const version: string = pkg.version;
