/** Safari and standalone WKWebExtension hosts share the WebKit API signatures. */
export const isWebKitExtension = (api: typeof chrome): boolean =>
    typeof api.runtime?.getURL === "function"
    && /^(?:safari-web-extension|safari-extension|webkit-extension):/.test(api.runtime.getURL(""));
