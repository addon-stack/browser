import {launchWebAuthFlow, type LaunchWebAuthFlowDetails} from "@addon-core/browser";

const details: LaunchWebAuthFlowDetails = {
    url: "https://example.test/oauth?redirect_uri=https%3A%2F%2Fextension.chromiumapp.org%2F",
    interactive: true,
};

const result: Promise<string | undefined> = launchWebAuthFlow(details);

launchWebAuthFlow({
    url: details.url,
    // @ts-expect-error redirect_uri belongs in the authorization URL, not native details.
    redirect_uri: "https://extension.chromiumapp.org/",
});

void result;
