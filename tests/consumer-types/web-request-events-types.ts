import {
    onWebRequestAuthRequired,
    onWebRequestBeforeRedirect,
    onWebRequestBeforeRequest,
    onWebRequestBeforeSendHeaders,
    onWebRequestCompleted,
    onWebRequestErrorOccurred,
    onWebRequestHeadersReceived,
    onWebRequestResponseStarted,
    onWebRequestSendHeaders,
} from "@addon-core/browser";

type NativeArguments = {
    onWebRequestAuthRequired: Parameters<typeof chrome.webRequest.onAuthRequired.addListener>;
    onWebRequestBeforeRedirect: Parameters<typeof chrome.webRequest.onBeforeRedirect.addListener>;
    onWebRequestBeforeRequest: Parameters<typeof chrome.webRequest.onBeforeRequest.addListener>;
    onWebRequestBeforeSendHeaders: Parameters<typeof chrome.webRequest.onBeforeSendHeaders.addListener>;
    onWebRequestCompleted: Parameters<typeof chrome.webRequest.onCompleted.addListener>;
    onWebRequestErrorOccurred: Parameters<typeof chrome.webRequest.onErrorOccurred.addListener>;
    onWebRequestHeadersReceived: Parameters<typeof chrome.webRequest.onHeadersReceived.addListener>;
    onWebRequestResponseStarted: Parameters<typeof chrome.webRequest.onResponseStarted.addListener>;
    onWebRequestSendHeaders: Parameters<typeof chrome.webRequest.onSendHeaders.addListener>;
};

const wrappers = {
    onWebRequestAuthRequired,
    onWebRequestBeforeRedirect,
    onWebRequestBeforeRequest,
    onWebRequestBeforeSendHeaders,
    onWebRequestCompleted,
    onWebRequestErrorOccurred,
    onWebRequestHeadersReceived,
    onWebRequestResponseStarted,
    onWebRequestSendHeaders,
};

type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const filter: chrome.webRequest.RequestFilter = {urls: ["https://example.test/*"]};
onWebRequestBeforeRequest(details => ({cancel: details.tabId === 7}), filter, ["blocking", "requestBody"]);
onWebRequestCompleted(() => undefined, filter);
onWebRequestCompleted(() => undefined, filter, undefined);

onWebRequestAuthRequired((details, respond) => {
    const host: string = details.challenger.host;
    respond?.({authCredentials: {username: host, password: "test"}});

    return undefined;
}, filter, ["asyncBlocking"]);

// @ts-expect-error The filter remains required.
onWebRequestBeforeRequest(() => undefined);
// @ts-expect-error The filter requires URL patterns.
onWebRequestBeforeRequest(() => undefined, {});
// @ts-expect-error Request-body options do not belong to response-header events.
onWebRequestHeadersReceived(() => undefined, filter, ["requestBody"]);
// @ts-expect-error Blocking is not an option for completed requests.
onWebRequestCompleted(() => undefined, filter, ["blocking"]);
// @ts-expect-error Callback details must keep their native type.
onWebRequestBeforeRequest((_details: string) => undefined, filter);
// @ts-expect-error The installed native callback type requires a synchronous blocking response.
onWebRequestBeforeRequest(async () => ({cancel: true}), filter);
