import request from "request";

/**
 * @param {string} url
 * @param {{ proxy?: string | undefined; [key: string]: unknown }} [options]
 *
 * @returns {Promise<unknown>}
 */
export default function get(url, options = {}) {
    const proxy =
        options.proxy ||
        process.env["http_proxy"] ||
        process.env["npm_config_https_proxy"];

    return new Promise((resolve, reject) => {
        request.get(url, { ...options, proxy }, (error, _response, body) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(body);
        });
    });
}
