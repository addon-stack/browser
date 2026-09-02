import {createConfigurableNamespaces} from "./configurable";
import {RAW_CAPABILITY_COVERAGE} from "./coverage";
import {createLastErrorController} from "./internal";

describe("configurable browser namespaces", () => {
    test("materializes every configurable method and raw event from the capability matrix", () => {
        const configurable = createConfigurableNamespaces({facade: "chrome"});

        for (const entry of RAW_CAPABILITY_COVERAGE) {
            if (entry.coverage === "configurable" && entry.kind === "method") {
                expect(configurable.method(entry.path)).toBeDefined();
            }
            if (entry.kind === "event") {
                expect(configurable.event(entry.path)).toBeDefined();
            }
        }
    });

    test("exposes typed callback controls and records callback calls", async () => {
        const configurable = createConfigurableNamespaces({facade: "chrome"});
        const item = {id: 7} as chrome.downloads.DownloadItem;

        configurable.controls.downloads.search.setResult([item]);

        const result = await new Promise<chrome.downloads.DownloadItem[]>(resolve => {
            configurable.api.downloads.search({id: 7}, resolve);
        });

        expect(result).toEqual([item]);
        expect(configurable.controls.downloads.search.calls).toMatchObject([
            {
                args: [{id: 7}],
                callbackCalls: [[[item]]],
                invocation: "callback",
            },
        ]);
        expect(configurable.calls.map(call => call.api)).toEqual(["downloads.search"]);
    });

    test("uses dual Promise behavior for browser facades", async () => {
        const configurable = createConfigurableNamespaces({facade: "browser"});
        const alarm: chrome.alarms.Alarm = {
            name: "deterministic-alarm",
            persistAcrossSessions: false,
            scheduledTime: 1,
        };

        configurable.controls.alarms.getAll.setResult([alarm]);

        await expect(configurable.api.alarms.getAll()).resolves.toEqual([alarm]);
        expect(configurable.controls.alarms.getAll.calls[0]).toMatchObject({
            args: [],
            callback: undefined,
            invocation: "promise",
        });
    });

    test("uses runtime.lastError only while a failing callback runs", () => {
        const lastError = createLastErrorController();
        const configurable = createConfigurableNamespaces({facade: "chrome", lastError});
        let observed: chrome.runtime.LastError | undefined;

        configurable.controls.alarms.getAll.failNext(new Error("alarms unavailable"));
        configurable.api.alarms.getAll(() => {
            observed = lastError.current;
        });

        expect(observed?.message).toBe("alarms unavailable");
        expect(lastError.current).toBeUndefined();
    });

    test("supports filtered event registrations and manual emission", async () => {
        const configurable = createConfigurableNamespaces({facade: "chrome"});
        const listener = jest.fn();
        const filter: chrome.webNavigation.WebNavigationEventFilter = {url: [{hostEquals: "example.test"}]};

        configurable.api.webNavigation.onCommitted.addListener(listener, filter);
        const details = {tabId: 3} as chrome.webNavigation.WebNavigationTransitionCallbackDetails;
        await configurable.controls.webNavigation.onCommitted.emit(details);

        expect(listener).toHaveBeenCalledWith(details);
        expect(configurable.controls.webNavigation.onCommitted.registrations()[0]?.args).toEqual([filter]);
    });

    test("physically removes and restores method capabilities", () => {
        const configurable = createConfigurableNamespaces({facade: "chrome"});

        configurable.setCapability("offscreen.hasDocument", false);
        expect(configurable.hasCapability("offscreen.hasDocument")).toBe(false);
        expect("hasDocument" in configurable.api.offscreen).toBe(false);

        configurable.reset();
        expect(configurable.hasCapability("offscreen.hasDocument")).toBe(true);
        expect(typeof configurable.api.offscreen.hasDocument).toBe("function");
    });

    test("does not silently answer an unconfigured method", () => {
        const configurable = createConfigurableNamespaces({facade: "chrome"});

        expect(() => configurable.api.extension.getViews()).toThrow(
            'Browser method "extension.getViews" was called without a configured result or implementation.'
        );
    });
});
