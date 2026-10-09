import suites from "../api";

import type {BrowserTestConfig} from "../types";

declare const __BROWSER_TEST_CONFIG__: BrowserTestConfig;

async function run(): Promise<void> {
    const config = __BROWSER_TEST_CONFIG__;
    const profile = suites.find(suite => suite.id === config.suite)?.profiles.find(item => item.id === config.profile);
    const results: {id: string; status: string; error?: string}[] = [];

    for (const scenario of profile?.scenarios ?? []) {
        if (scenario.browsers && !scenario.browsers.includes(config.browser)) {
            continue;
        }

        try {
            await scenario.run(config);
            results.push({id: scenario.id, status: "passed"});
        } catch (error) {
            results.push({id: scenario.id, status: "failed", error: error instanceof Error ? error.stack : String(error)});
        }
    }

    const response = await fetch(`${config.base}/result/${config.token}`, {
        method: "POST",
        body: JSON.stringify({suite: config.suite, profile: config.profile, results}),
    });

    if (!response.ok) {
        throw new Error(`Browser report rejected: ${response.status}`);
    }
}

void run().catch(error => console.error("Browser integration runner failed", error));
