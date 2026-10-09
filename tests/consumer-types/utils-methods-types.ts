import {callBrowserMethod} from "@addon-core/browser/utils";

const auth: Promise<string | undefined> = callBrowserMethod({
    callback: (api, done) => api.identity.launchWebAuthFlow({url: "https://example.test/oauth"}, done),
    promise: api => api.identity.launchWebAuthFlow({url: "https://example.test/oauth"}),
});

const ungroup: Promise<void> = callBrowserMethod<void>({
    callback: (api, done) => api.tabs.ungroup([7, 8], done),
    promise: api => api.tabs.ungroup([7, 8]),
});

callBrowserMethod<string>({
    callback: (_api, done) => {
        // @ts-expect-error The callback result must match the Promise result.
        done(7);
    },
    promise: async () => "result",
});

callBrowserMethod<void>({
    callback: () => {},
    // @ts-expect-error The Promise branch must return a Promise or thenable.
    promise: () => {},
});

void auth;
void ungroup;
