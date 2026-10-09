import {assert} from "../../extension/assert";

export function authUrl(base: string, action: string, flow: string, redirectUrl?: string, responseUrl?: string): string {
    const url = new URL(`/auth/${action}`, base);
    url.searchParams.set("flow", flow);

    if (redirectUrl !== undefined) {
        url.searchParams.set("redirect_uri", redirectUrl);
    }

    if (responseUrl !== undefined) {
        url.searchParams.set("response_url", responseUrl);
    }

    return url.href;
}

export async function authStatus(base: string, flow: string): Promise<{started: number; polls: number}> {
    const response = await fetch(authUrl(base, "status", flow));
    assert(response.ok, "Authorization fixture status failed");

    return response.json();
}
