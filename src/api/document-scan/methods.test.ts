import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

const filter: chrome.documentScan.DeviceFilter = {local: true, secure: true};
const scanOptions: chrome.documentScan.ScanOptions = {mimeTypes: ["image/png"]};
const settings: chrome.documentScan.OptionSetting[] = [{name: "resolution", type: "INT", value: 300}];
const startOptions: chrome.documentScan.StartScanOptions = {format: "image/png", maxReadSize: 1024};
const cancelScanResult: chrome.documentScan.CancelScanResponse<string> = {job: "job", result: "CANCELLED"};
const closeScannerResult: chrome.documentScan.CloseScannerResponse<string> = {scannerHandle: "scanner", result: "SUCCESS"};
const getOptionGroupsResult: chrome.documentScan.GetOptionGroupsResponse<string> = {scannerHandle: "scanner", result: "SUCCESS", groups: []};
const getScannerListResult: chrome.documentScan.GetScannerListResponse = {result: "SUCCESS", scanners: []};
const openScannerResult: chrome.documentScan.OpenScannerResponse<string> = {scannerId: "device", scannerHandle: "scanner", result: "SUCCESS", options: {}};
const readScanDataResult: chrome.documentScan.ReadScanDataResponse<string> = {job: "job", result: "SUCCESS", data: new ArrayBuffer(4), estimatedCompletion: 50};
const scanResult: chrome.documentScan.ScanResults = {dataUrls: ["data:image/png;base64,scan"], mimeType: "image/png"};
const setOptionsResult: chrome.documentScan.SetOptionsResponse<string> = {scannerHandle: "scanner", results: []};
const startScanResult: chrome.documentScan.StartScanResponse<string> = {scannerHandle: "scanner", job: "job", result: "SUCCESS"};

const cases = [
    {
        name: "cancelScan", invoke: () => api.cancelDocScanning("job"), args: ["job"], result: cancelScanResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.cancelScan.setResult(cancelScanResult),
    },
    {
        name: "closeScanner", invoke: () => api.closeDocScanner("scanner"), args: ["scanner"], result: closeScannerResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.closeScanner.setResult(closeScannerResult),
    },
    {
        name: "getOptionGroups", invoke: () => api.getDocScannerOptionGroups("scanner"), args: ["scanner"], result: getOptionGroupsResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.getOptionGroups.setResult(getOptionGroupsResult),
    },
    {
        name: "getScannerList", invoke: () => api.getDocScannerList(filter), args: [filter], result: getScannerListResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.getScannerList.setResult(getScannerListResult),
    },
    {
        name: "openScanner", invoke: () => api.openDocScanner("device"), args: ["device"], result: openScannerResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.openScanner.setResult(openScannerResult),
    },
    {
        name: "readScanData", invoke: () => api.readDocScanningData("job"), args: ["job"], result: readScanDataResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.readScanData.setResult(readScanDataResult),
    },
    {
        name: "scan", invoke: () => api.docScanning(scanOptions), args: [scanOptions], result: scanResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.scan.setResult(scanResult),
    },
    {
        name: "setOptions", invoke: () => api.setDocScannerOptions("scanner", settings), args: ["scanner", settings], result: setOptionsResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.setOptions.setResult(setOptionsResult),
    },
    {
        name: "startScan", invoke: () => api.startDocScanning("scanner", startOptions), args: ["scanner", startOptions], result: startScanResult,
        configure: (harness: BrowserHarness) => harness.configurable.active.documentScan.startScan.setResult(startScanResult),
    },
] as const;

describe.each(["chrome", "firefox"] as const)("document-scan methods in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test.each(cases)("$name forwards native arguments and preserves the response", async ({name, invoke, args, result, configure}) => {
        configure(harness);
        await expect(invoke()).resolves.toBe(result);
        const calls = harness.configurable.active.documentScan[name].calls;
        expect(calls).toHaveLength(1);
        expect(calls[0].args).toEqual(args);
        args.forEach((arg, index) => expect(calls[0].args[index]).toBe(arg));
    });

    test.each(cases)("$name propagates native errors", async ({name, invoke}) => {
        harness.configurable.active.documentScan[name].failNext(new Error("Scanner unavailable"));
        await expect(invoke()).rejects.toThrow("Scanner unavailable");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test("returns a native failure response without turning it into a rejected Promise", async () => {
        const result: chrome.documentScan.OpenScannerResponse<string> = {scannerId: "device", result: "DEVICE_BUSY"};
        harness.configurable.active.documentScan.openScanner.setResult(result);
        await expect(api.openDocScanner("device")).resolves.toBe(result);
    });
});
