import {cancelDocScanning, closeDocScanner, docScanning, getDocScannerList, getDocScannerOptionGroups, openDocScanner, readDocScanningData, setDocScannerOptions, startDocScanning} from "@addon-core/browser";

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

const methods = {cancelDocScanning, closeDocScanner, getDocScannerOptionGroups, getDocScannerList, openDocScanner, readDocScanningData, docScanning, setDocScannerOptions, startDocScanning};

type Expected = {
    cancelDocScanning: (job: string) => Promise<CancelScanResponse<string>>;
    closeDocScanner: (scannerHandle: string) => Promise<CloseScannerResponse<string>>;
    getDocScannerOptionGroups: (scannerHandle: string) => Promise<GetOptionGroupsResponse<string>>;
    getDocScannerList: (filter: DeviceFilter) => Promise<GetScannerListResponse>;
    openDocScanner: (scannerId: string) => Promise<OpenScannerResponse<string>>;
    readDocScanningData: (job: string) => Promise<ReadScanDataResponse<string>>;
    docScanning: (options: ScanOptions) => Promise<ScanResults>;
    setDocScannerOptions: (scannerHandle: string, options: OptionSetting[]) => Promise<SetOptionsResponse<string>>;
    startDocScanning: (scannerHandle: string, options: StartScanOptions) => Promise<StartScanResponse<string>>;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
void [methods, signaturesUnchanged];
