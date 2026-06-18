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
            required: ["email", "website"],
            type: "object",
        },
    ],
    [
        "https://raw.githubusercontent.com/ota-meshi/extract-vscode-schemas/main/resources/vscode/schemas/launch.json",
        {
            properties: {
                compounds: {
                    items: {
                        properties: {
                            configurations: {
                                items: {
                                    oneOf: "not-an-object",
                                },
                            },
                        },
                    },
                },
            },
            type: "object",
        },
    ],
    [
        "https://raw.githubusercontent.com/ota-meshi/extract-vscode-schemas/main/resources/vscode/schemas/settings/machine.json",
        {
            properties: {
                "workbench.externalUriOpeners": {
                    additionalProperties: {
                        anyOf: [
                            {
                                enum: [],
                            },
                            {
                                properties: {
                                    nested: {
                                        enum: [],
                                    },
                                },
                                type: "object",
                            },
                        ],
                    },
                },
            },
            type: "object",
        },
    ],
    [
        "https://raw.githubusercontent.com/ota-meshi/extract-vscode-schemas/main/resources/vscode/schemas/settings/workspace.json",
        {
            allOf: [
                {
                    properties: {
                        "editor.defaultFormatter": {
                            enum: [null, "vscode.markdown-language-features"],
                            enumDescriptions: [
                                "None",
                                "Built-in Markdown formatter",
                            ],
                            type: ["string", "null"],
                        },
                    },
                    type: "object",
                },
            ],
            patternProperties: {
                "^\\[.*\\]$": {
                    properties: {
                        "editor.defaultFormatter": {
                            enum: [null, "vscode.markdown-language-features"],
                            enumDescriptions: [
                                "None",
                                "Built-in Markdown formatter",
                            ],
                            type: ["string", "null"],
                        },
                    },
                    type: "object",
                },
            },
            properties: {
                "workbench.externalUriOpeners": {
                    additionalProperties: {
                        anyOf: [
                            {
                                enum: [],
                            },
                            {
                                properties: {
                                    nested: {
                                        enum: [],
                                    },
                                },
                                type: "object",
                            },
                        ],
                    },
                },
            },
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
