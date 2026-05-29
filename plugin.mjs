import builtPlugin from "./dist/plugin.mjs";

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
    ...builtPlugin,
};

export default plugin;
