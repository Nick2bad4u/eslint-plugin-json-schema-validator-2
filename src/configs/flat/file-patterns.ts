/** File patterns parsed with jsonc-eslint-parser in the flat configs. */
export const jsonFilePatterns = [
    "**/*.json",
    "**/*.json5",
    "**/*.jsonc",
    "*.json",
    "*.json5",
    "*.jsonc",
] as const;

/** File patterns parsed with toml-eslint-parser in the flat configs. */
export const tomlFilePatterns = ["**/*.toml", "*.toml"] as const;

/** File patterns parsed with yaml-eslint-parser in the flat configs. */
export const yamlFilePatterns = [
    "**/*.yaml",
    "**/*.yml",
    "*.yaml",
    "*.yml",
] as const;

/** File patterns validated by the recommended flat config. */
export const structuredDataFilePatterns: readonly string[] = [
    ...jsonFilePatterns,
    ...yamlFilePatterns,
    ...tomlFilePatterns,
];
