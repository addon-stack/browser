/** A local authorization provider; no accounts, credentials or external services. */
export function createAuthFixture() {
    const flows = new Map();

    return (request, response) => {
        const url = new URL(request.url, "http://localhost");
        const action = url.pathname.slice("/auth/".length);

        if (!url.pathname.startsWith("/auth/") ||
            !["redirect", "login", "interactive", "decision", "approve", "status", "error"].includes(action)) {
            return false;
        }

        if (request.method !== (action === "approve" ? "POST" : "GET")) {
            response.writeHead(405).end();

            return true;
        }

        const id = url.searchParams.get("flow");

        if (!id) {
            response.writeHead(400).end("Missing flow ID");

            return true;
        }

        if (!flows.has(id)) {
            flows.set(id, {started: 0, polls: 0, approved: false, redirectUrl: null});
        }

        const flow = flows.get(id);
        response.setHeader("Cache-Control", "no-store");

        if (["redirect", "interactive"].includes(action)) {
            try {
                const target = new URL(url.searchParams.get("response_url") || url.searchParams.get("redirect_uri"));

                if (!["http:", "https:"].includes(target.protocol)) {
                    throw new Error("Invalid redirect protocol");
                }

                flow.redirectUrl = target.href;
            } catch {
                response.writeHead(400).end("Invalid redirect URL");

                return true;
            }
        }

        if (action === "status") {
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(flow));
        } else if (action === "approve") {
            flow.approved = true;
            response.writeHead(204).end();
        } else if (action === "decision") {
            flow.polls++;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({redirectUrl: flow.approved ? flow.redirectUrl : null}));
        } else {
            flow.started++;

            if (action === "redirect") {
                response.writeHead(302, {Location: flow.redirectUrl}).end();
            } else {
                const pollUrl = JSON.stringify(`/auth/decision?flow=${encodeURIComponent(id)}`).replaceAll("<", "\\u003c");
                response.setHeader("Content-Type", "text/html; charset=utf-8");
                response.statusCode = action === "error" ? 503 : 200;

                response.end(`<!doctype html><title>Test authorization</title><p>Local authorization fixture</p>${action === "interactive" ? `<script>
                    const poll = async () => {
                        const result = await (await fetch(${pollUrl})).json();
                        if (result.redirectUrl) location.assign(result.redirectUrl);
                        else setTimeout(poll, 50);
                    };
                    window.addEventListener("load", poll);
                </script>` : ""}`);
            }
        }

        return true;
    };
}
