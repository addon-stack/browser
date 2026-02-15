import {browser} from "./browser";
import {callWithPromise} from "./utils";

type CancelScanResponse<T> = chrome.documentScan.CancelScanResponse<T>;
type CloseScannerResponse<T> = chrome.documentScan.CloseScannerResponse<T>;
type DeviceFilter = chrome.documentScan.DeviceFilter;
type GetOptionGroupsResponse<T> = chrome.documentScan.GetOptionGroupsResponse<T>;
type GetScannerListResponse = chrome.documentScan.GetScannerListResponse;
type OpenScannerResponse<T> = chrome.documentScan.OpenScannerResponse<T>;
type OptionSetting = chrome.documentScan.OptionSetting;
type ReadScanDataResponse<T> = chrome.documentScan.ReadScanDataResponse<T>;
type ScanOptions = chrome.documentScan.ScanOptions;
type ScanResults = chrome.documentScan.ScanResults;
type SetOptionsResponse<T> = chrome.documentScan.SetOptionsResponse<T>;
type StartScanOptions = chrome.documentScan.StartScanOptions;
type StartScanResponse<T> = chrome.documentScan.StartScanResponse<T>;

const documentScan = () => browser().documentScan;

// Methods
export const cancelDocScanning = (job: string): Promise<CancelScanResponse<string>> =>
    callWithPromise(cb => documentScan().cancelScan(job, cb));

export const closeDocScanner = (scannerHandle: string): Promise<CloseScannerResponse<string>> =>
    callWithPromise(cb => documentScan().closeScanner(scannerHandle, cb));

export const getDocScannerOptionGroups = (scannerHandle: string): Promise<GetOptionGroupsResponse<string>> =>
    callWithPromise(cb => documentScan().getOptionGroups(scannerHandle, cb));

export const getDocScannerList = (filter: DeviceFilter): Promise<GetScannerListResponse> =>
    callWithPromise(cb => documentScan().getScannerList(filter, cb));

export const openDocScanner = (scannerId: string): Promise<OpenScannerResponse<string>> =>
    callWithPromise(cb => documentScan().openScanner(scannerId, cb));

export const readDocScanningData = (job: string): Promise<ReadScanDataResponse<string>> =>
    callWithPromise(cb => documentScan().readScanData(job, cb));

export const docScanning = (options: ScanOptions): Promise<ScanResults> =>
    callWithPromise(cb => documentScan().scan(options, cb));

export const setDocScannerOptions = (
    scannerHandle: string,
    options: OptionSetting[]
): Promise<SetOptionsResponse<string>> => callWithPromise(cb => documentScan().setOptions(scannerHandle, options, cb));

export const startDocScanning = (
    scannerHandle: string,
    options: StartScanOptions
): Promise<StartScanResponse<string>> => callWithPromise(cb => documentScan().startScan(scannerHandle, options, cb));
