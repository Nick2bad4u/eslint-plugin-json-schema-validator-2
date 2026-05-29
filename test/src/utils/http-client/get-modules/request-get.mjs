/**
 * @param {string} url
 * @param {RequestInit} [options]
 *
 * @returns {Promise<string>}
 */
export default async function get(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(
            `Request failed with status ${String(response.status)}.`
        );
    }

    return response.text();
}
