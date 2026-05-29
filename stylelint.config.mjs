import sharedConfig from "stylelint-config-nick2bad4u";

/** @type {import("stylelint").Config} */
const stylelintConfig = {
    ...sharedConfig,
    overrides: [
        ...(sharedConfig.overrides ?? []),
        {
            files: ["docs/docusaurus/src/**/*.css"],
            rules: {
                "css-performance-budget/no-expensive-animation-properties":
                    null,
                "css-performance-budget/no-layout-thrashing-properties": null,
                "css-performance-budget/no-paint-heavy-declarations": null,
            },
        },
    ],
};

export default stylelintConfig;
