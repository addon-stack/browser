import {type BrowserTestApi, installGlobals} from "../../src/testing";

/** Partial native shapes for callback, Promise-only and legacy synchronous API regressions. */
export const installNativeApiFixture = () => {
    const native: {
        runtime: {id: string; getURL(path: string): string; getManifest(): {manifest_version: 2 | 3}};
        [namespace: string]: any;
    } = {
        runtime: {
            id: "native-fixture",
            getURL: path => `webkit-extension://fixture/${path}`,
            getManifest: () => ({manifest_version: 3}),
        },
    };

    const api = native as unknown as BrowserTestApi;
    const restore = installGlobals({chrome: api, browser: api});

    return {native, restore};
};
