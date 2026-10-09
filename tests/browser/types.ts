export type BrowserName = "chromium" | "firefox";

export interface ScenarioContext {
    browser: BrowserName;
    base: string;
}

export interface BrowserScenario {
    id: string;
    browsers?: BrowserName[];
    run(context: ScenarioContext): Promise<void>;
}

export interface BrowserProfile {
    id: string;
    permissions: string[];
    scenarios: BrowserScenario[];
    manifest?: Partial<Record<BrowserName, Record<string, unknown>>>;
}

export interface BrowserSuite {
    id: string;
    browsers: BrowserName[];
    profiles: BrowserProfile[];
}

export interface BrowserTestConfig extends ScenarioContext {
    suite: string;
    profile: string;
    token: string;
}
