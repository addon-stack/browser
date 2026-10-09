import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import {getAudioDevices, getAudioMute, setAudioActiveDevices, setAudioMute, setAudioProperties} from "./methods";

const output = "OUTPUT" as chrome.audio.StreamType;

describe.each(["chrome", "firefox"] as const)("audio methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
        const native = harness.configurable.active.audio;
        native.setActiveDevices.setResult(undefined);
        native.setMute.setResult(undefined);
        native.setProperties.setResult(undefined);
    });

    afterEach(() => {
        restoreGlobals();
    });

    test("getAudioDevices passes filters and defaults to an empty filter", async () => {
        const method = harness.configurable.active.audio.getDevices;

        const devices: chrome.audio.AudioDeviceInfo[] = [{
            id: "speaker", deviceName: "Speaker", displayName: "Speaker", deviceType: "USB",
            isActive: true, level: 70, streamType: "OUTPUT",
        }];

        const filter = {isActive: true};
        method.setResult(devices);
        await expect(getAudioDevices(filter)).resolves.toBe(devices);
        await expect(getAudioDevices()).resolves.toBe(devices);
        expect(method.calls.map(call => call.args)).toEqual([[filter], [{}]]);
        expect(method.calls[0].args[0]).toBe(filter);
    });

    test("mute methods preserve stream type and boolean values", async () => {
        const native = harness.configurable.active.audio;
        native.getMute.queueResult(true, false);
        await expect(getAudioMute(output)).resolves.toBe(true);
        await expect(getAudioMute(output)).resolves.toBe(false);
        await expect(setAudioMute(output, false)).resolves.toBeUndefined();
        expect(native.getMute.calls.map(call => call.args)).toEqual([[output], [output]]);
        expect(native.setMute.calls[0].args).toEqual([output, false]);
    });

    test("device setters preserve explicit options and normalize omitted options", async () => {
        const native = harness.configurable.active.audio;
        const ids = {input: [], output: ["speaker"]};
        const properties = {level: 0};
        await expect(setAudioActiveDevices(ids)).resolves.toBeUndefined();
        await setAudioActiveDevices();
        await expect(setAudioProperties("speaker", properties)).resolves.toBeUndefined();
        await setAudioProperties("microphone");
        expect(native.setActiveDevices.calls.map(call => call.args)).toEqual([[ids], [{}]]);
        expect(native.setProperties.calls.map(call => call.args)).toEqual([["speaker", properties], ["microphone", {}]]);
        expect(native.setActiveDevices.calls[0].args[0]).toBe(ids);
        expect(native.setProperties.calls[0].args[1]).toBe(properties);
    });

    test.each([
        ["getDevices", () => getAudioDevices()],
        ["getMute", () => getAudioMute(output)],
        ["setMute", () => setAudioMute(output, true)],
        ["setActiveDevices", () => setAudioActiveDevices()],
        ["setProperties", () => setAudioProperties("speaker")],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.configurable.active.audio[name].failNext(new Error("Audio unavailable"));
        await expect(invoke()).rejects.toThrow("Audio unavailable");
    });
});
