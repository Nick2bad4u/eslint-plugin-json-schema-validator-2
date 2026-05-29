import http, { type IncomingMessage } from "node:http";
import https, { type RequestOptions } from "node:https";
import { ProxyAgent } from "proxy-agent";
import { arrayJoin, isDefined } from "ts-extras";

const TIMEOUT = 60_000;
const MAX_REDIRECT_COUNT = 3;

interface HttpRequestOptions extends RequestOptions {
    proxy?: string;
}

interface ResponseListeners {
    data: (chunk: Buffer | string) => void;
    end: () => void;
    error: (error: unknown) => void;
}

interface ResponseState {
    chunks: string[];
    listeners?: ResponseListeners;
    options: Readonly<HttpRequestOptions> | undefined;
    redirectCount: number;
    reject: (reason?: unknown) => void;
    resolve: (value: PromiseLike<string> | string) => void;
    url: string;
}

/**
 * GET Method using http modules.
 */
export default async function get(
    url: string,
    options?: Readonly<HttpRequestOptions>
): Promise<string> {
    return get0(url, options, 0);
}

function cleanupResponseListeners(
    res: IncomingMessage,
    state: ResponseState
): void {
    const listeners = state.listeners;
    if (!isDefined(listeners)) {
        return;
    }

    res.off("data", listeners.data);
    res.off("end", listeners.end);
    res.off("error", listeners.error);
    delete state.listeners;
}

/** Implementation of HTTP GET method */
async function get0(
    url: string,
    options: Readonly<HttpRequestOptions> | undefined,
    redirectCount: number
): Promise<string> {
    const client = url.startsWith("https") ? https : http;
    const parsedOptions = parseUrlAndOptions(url, options ?? {});

    return new Promise((resolve, reject) => {
        const state: ResponseState = {
            chunks: [],
            options,
            redirectCount,
            reject,
            resolve,
            url,
        };
        const req = client.get(
            parsedOptions,
            handleResponse.bind(undefined, state)
        );
        const handleRequestError = (error: unknown): void => {
            req.off("error", handleRequestError);
            reject(toError(error));
        };

        req.on("error", handleRequestError);
        req.setTimeout(TIMEOUT, function handleRequestTimeout() {
            req.off("error", handleRequestError);
            req.destroy();
            reject(new Error(`Timeout of ${String(TIMEOUT)}ms exceeded`));
        });
    });
}

function getProxyAgent(proxyUrl: string | undefined): ProxyAgent {
    if (isDefined(proxyUrl) && proxyUrl !== "") {
        return new ProxyAgent({
            getProxyForUrl: () => proxyUrl,
        });
    }

    return new ProxyAgent();
}

function handleResponse(state: ResponseState, res: IncomingMessage): void {
    const listeners: ResponseListeners = {
        data: handleResponseData.bind(undefined, state),
        end: handleResponseEnd.bind(undefined, res, state),
        error: handleResponseError.bind(undefined, res, state),
    };
    state.listeners = listeners;
    res.on("data", listeners.data);
    res.on("end", listeners.end);
    res.on("error", listeners.error);
}

function handleResponseData(
    state: ResponseState,
    chunk: Readonly<Buffer> | string
): void {
    state.chunks.push(stringifyResponseChunk(chunk));
}

function handleResponseEnd(res: IncomingMessage, state: ResponseState): void {
    cleanupResponseListeners(res, state);
    if (
        isDefined(res.statusCode) &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        state.redirectCount < MAX_REDIRECT_COUNT
    ) {
        const location = res.headers.location;
        if (!isDefined(location)) {
            state.reject(
                new Error(
                    `Redirect response from ${state.url} did not include a Location header.`
                )
            );
            return;
        }
        try {
            const redirectUrl = new URL(location, state.url).toString();
            state.resolve(
                get0(redirectUrl, state.options, state.redirectCount + 1)
            );
        } catch (error) {
            state.reject(toError(error));
        }
        return;
    }
    state.resolve(arrayJoin(state.chunks, ""));
}

function handleResponseError(
    res: IncomingMessage,
    state: ResponseState,
    error: unknown
): void {
    cleanupResponseListeners(res, state);
    state.reject(toError(error));
}

/** Parse URL and options */
function parseUrlAndOptions(
    urlStr: string,
    baseOptions: Readonly<HttpRequestOptions>
): HttpRequestOptions {
    const url = new URL(urlStr);
    const hostname =
        typeof url.hostname === "string" && url.hostname.startsWith("[")
            ? url.hostname.slice(1, -1)
            : url.hostname;
    const options: HttpRequestOptions = {
        agent: false,
        ...baseOptions,
        hostname,
        path: `${url.pathname}${url.search}`,
        protocol: url.protocol,
    };
    if (url.port !== "") {
        options.port = Number(url.port);
    }
    if (url.username || url.password) {
        options.auth = `${url.username}:${url.password}`;
    }

    options.agent = getProxyAgent(options.proxy);
    return options;
}

function stringifyResponseChunk(chunk: Readonly<Buffer> | string): string {
    return typeof chunk === "string" ? chunk : chunk.toString("utf8");
}

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}
