import type { RequestOptions } from "node:https";

import * as nodeHttp from "node:http";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { get } from "../../../../src/utils/http-client/http";
import { syncGet } from "../../../../src/utils/http-client/sync-http";

const require = createRequire(import.meta.url);
// eslint-disable-next-line unicorn/prefer-import-meta-properties -- import.meta.dirname is not available across the configured Node range.
const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const GET_MODULES_DIR = path.join(TEST_DIR, "get-modules");
const HTTP_PROTOCOL = "http";
const HTTP_URL_PREFIX = `${HTTP_PROTOCOL}://`;
const packageUrl =
    "https://raw.githubusercontent.com/ota-meshi/eslint-plugin-json-schema-validator/main/package.json";
const packageName = "eslint-plugin-json-schema-validator";

interface ProxyRequestOptions extends RequestOptions {
    proxy: string;
}

interface TestServer {
    close: () => Promise<void>;
    origin: string;
    url: (pathname: string) => string;
}

async function createTestServer(
    listener: nodeHttp.RequestListener,
    hostname = "127.0.0.1"
): Promise<TestServer> {
    const server = nodeHttp.createServer(listener);

    await new Promise<void>((resolve) => {
        server.listen(0, hostname, resolve);
    });

    const address = server.address();
    if (typeof address !== "object" || address === null) {
        throw new TypeError(
            "Expected test HTTP server to expose an address object."
        );
    }

    const host = hostname.includes(":") ? `[${hostname}]` : hostname;
    const origin = `${HTTP_URL_PREFIX}${host}:${String(address.port)}`;

    return {
        close: () =>
            new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error === undefined) {
                        resolve();
                        return;
                    }
                    reject(error);
                });
            }),
        origin,
        url: (pathname) =>
            `${HTTP_URL_PREFIX}user:pass@${host}:${String(address.port)}${pathname}`,
    };
}

function parsePackageName(responseBody: string): string {
    const value = JSON.parse(responseBody) as { name?: unknown };

    if (typeof value.name !== "string") {
        throw new TypeError(
            "Expected package metadata to include a string name."
        );
    }

    return value.name;
}

describe("http get.", () => {
    it("should to receive a request.", async () => {
        expect.assertions(1);

        const res = await get(packageUrl);

        expect(parsePackageName(res)).toBe(packageName);
    });

    it("should to receive a request with option and sync.", () => {
        expect.assertions(1);

        const res = syncGet(
            packageUrl,
            {},
            require.resolve("./get-modules/request-get.mjs")
        );

        expect(parsePackageName(res)).toBe(packageName);
    });

    it("should to receive a request with a redirect.", async () => {
        expect.assertions(1);

        const res = await get(
            "https://unpkg.com/eslint-plugin-json-schema-validator/package.json"
        );

        expect(parsePackageName(res)).toBe(packageName);
    });

    it("should to receive a request with a redirect (2).", async () => {
        expect.assertions(1);

        const res = await get(
            "https://raw.github.com/ota-meshi/eslint-plugin-json-schema-validator/main/package.json"
        );

        expect(parsePackageName(res)).toBe(packageName);
    });

    it("should reject failed requests.", async () => {
        expect.assertions(1);

        await expect(
            get("https://example.invalid/package.json")
        ).rejects.toThrow(Error);
    });

    it("loads a CommonJS custom HTTP module by absolute path", async () => {
        expect.assertions(1);

        const res = await get(
            "https://example.com/direct-json.json",
            {},
            path.join(GET_MODULES_DIR, "direct-json.cjs")
        );

        expect(JSON.parse(res)).toStrictEqual({
            direct: true,
            url: "https://example.com/direct-json.json",
        });
    });

    it("loads an ESM custom HTTP module by file URL", async () => {
        expect.assertions(1);

        const moduleUrl = pathToFileURL(
            path.join(GET_MODULES_DIR, "static-json.mjs")
        ).href;

        const res = await get(
            "https://example.com/cache-test.json",
            {},
            moduleUrl
        );

        expect(JSON.parse(res)).toStrictEqual({ cached: true });
    });

    it("rejects custom HTTP modules that do not export a function", async () => {
        expect.assertions(1);

        await expect(
            get(
                "https://example.com/cache-test.json",
                {},
                path.join(GET_MODULES_DIR, "invalid-export.mjs")
            )
        ).rejects.toThrow("Configured HTTP module must export a GET function.");
    });

    it("requests local HTTP URLs with port, auth, and query components", async () => {
        expect.assertions(1);

        const server = await createTestServer((request, response) => {
            response.setHeader("content-type", "application/json");
            response.end(
                JSON.stringify({
                    auth: request.headers.authorization,
                    url: request.url,
                })
            );
        });

        try {
            const res = await get(server.url("/schema.json?draft=7"));

            expect(JSON.parse(res)).toStrictEqual({
                auth: "Basic dXNlcjpwYXNz",
                url: "/schema.json?draft=7",
            });
        } finally {
            await server.close();
        }
    });

    it("rejects redirect responses without a location header", async () => {
        expect.assertions(1);

        const server = await createTestServer((_request, response) => {
            response.statusCode = 302;
            response.end();
        });

        try {
            await expect(get(server.url("/missing-location"))).rejects.toThrow(
                "did not include a Location header"
            );
        } finally {
            await server.close();
        }
    });

    it("stops following redirects after the redirect limit", async () => {
        expect.assertions(1);

        const server = await createTestServer((_request, response) => {
            response.statusCode = 302;
            response.setHeader("location", "/loop");
            response.end("redirect limit reached");
        });

        try {
            await expect(get(server.url("/loop"))).resolves.toBe(
                "redirect limit reached"
            );
        } finally {
            await server.close();
        }
    });

    it("supports proxy request options for HTTP URLs", async () => {
        expect.assertions(1);

        const proxy = await createTestServer((request, response) => {
            response.setHeader("content-type", "application/json");
            response.end(
                JSON.stringify({
                    proxiedUrl: request.url,
                })
            );
        });

        try {
            const options: ProxyRequestOptions = {
                proxy: proxy.origin,
            };
            const proxiedUrl = `${HTTP_URL_PREFIX}example.test/schema.json`;
            const res = await get(proxiedUrl, options);

            expect(JSON.parse(res)).toStrictEqual({
                proxiedUrl,
            });
        } finally {
            await proxy.close();
        }
    });

    it("rejects invalid redirect locations", async () => {
        expect.assertions(1);

        const server = await createTestServer((_request, response) => {
            response.statusCode = 302;
            response.setHeader("location", `${HTTP_URL_PREFIX}[`);
            response.end();
        });

        try {
            await expect(get(server.url("/invalid-location"))).rejects.toThrow(
                Error
            );
        } finally {
            await server.close();
        }
    });

    it("normalizes bracketed IPv6 hostnames when parsing URLs", async () => {
        expect.assertions(1);

        const server = await createTestServer((_request, response) => {
            response.end("ipv6 ok");
        }, "::1");

        try {
            await expect(get(server.url("/ipv6"))).resolves.toBe("ipv6 ok");
        } finally {
            await server.close();
        }
    });
});
