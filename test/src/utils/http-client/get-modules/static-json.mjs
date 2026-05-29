const schemas = new Map([
    [
        "https://example.com/cache-test.json",
        {
            cached: true,
        },
    ],
    [
        "https://example.com/yaml-comment.schema.json",
        {
            additionalProperties: false,
            properties: {
                email: {
                    format: "email",
                    type: "string",
                },
                website: {
                    format: "uri",
                    type: "string",
                },
            },
            required: [
                "email",
                "website",
            ],
            type: "object",
        },
    ],
]);

/**
 * @param {string} url
 *
 * @returns {Promise<string>}
 */
export default async function get(url) {
    await Promise.resolve();

    const data = schemas.get(url);
    if (data === undefined) {
        throw new Error(`Unexpected test URL: ${url}`);
    }
    return JSON.stringify(data);
}
