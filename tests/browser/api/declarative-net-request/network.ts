import {browser} from "../../../../dist/index.js";
import {assert, waitFor} from "../../extension/assert";

export interface NetworkResult {
    ok: boolean;
    url?: string;
    responseHeader?: string | null;
    data?: {path: string; headers: Record<string, string>};
}

export async function openFixture(base: string): Promise<number> {
    const tab = await browser().tabs.create({url: `${base}/fixture`, active: false});
    assert(tab.id !== undefined, "Network fixture tab needs an ID");
    await waitFor(() => browser().tabs.get(tab.id!), value => value.status === "complete" && value.url === `${base}/fixture`, "network fixture tab");

    return tab.id;
}

/** Initiate requests in an ordinary web page, not in the privileged extension. */
export async function requestFromTab(tabId: number, base: string, path: string): Promise<NetworkResult> {
    const results = await browser().scripting.executeScript({
        target: {tabId},
        args: [`${base}${path}`],
        func: async (url: string): Promise<NetworkResult> => {
            try {
                const response = await fetch(url, {cache: "no-store"});

                return {ok: response.ok, url: response.url, responseHeader: response.headers.get("x-fixture-response"), data: await response.json()};
            } catch {
                return {ok: false};
            }
        },
    });

    assert(results.length === 1 && results[0].result, "Missing page network result");

    return results[0].result;
}

export async function requestCount(base: string, path: string): Promise<number> {
    const response = await fetch(`${base}/network/counts`, {cache: "no-store"});
    assert(response.ok, "Network oracle unavailable");
    const counts = await response.json() as Record<string, number>;

    return counts[path] ?? 0;
}
