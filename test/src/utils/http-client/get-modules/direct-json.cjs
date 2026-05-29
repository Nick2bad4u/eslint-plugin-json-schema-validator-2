/* eslint-disable import-x/no-commonjs, import-x/unambiguous -- CJS fixture covers require() custom HTTP module loading. */

/**
 * @param {string} url
 *
 * @returns {Promise<string>}
 */
module.exports = async function get(url) {
    await Promise.resolve();

    return JSON.stringify({
        direct: true,
        url,
    });
};

/* eslint-enable import-x/no-commonjs, import-x/unambiguous -- Re-enable after the CJS fixture export. */
