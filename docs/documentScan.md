# documentScan

Documentation: [Chrome Document Scan API](https://developer.chrome.com/docs/extensions/reference/documentScan)

A promise-based wrapper for the Chrome `documentScan` API.

## Methods

- [cancelDocScanning(job)](#cancelDocScanning)
- [closeDocScanner(scannerHandle)](#closeDocScanner)
- [getDocScannerOptionGroups(scannerHandle)](#getDocScannerOptionGroups)
- [getDocScannerList(filter)](#getDocScannerList)
- [openDocScanner(scannerId)](#openDocScanner)
- [readDocScanningData(job)](#readDocScanningData)
- [docScanning(options)](#docScanning)
- [setDocScannerOptions(scannerHandle, options)](#setDocScannerOptions)
- [startDocScanning(scannerHandle, options)](#startDocScanning)

---

<a name="cancelDocScanning"></a>

### cancelDocScanning

```
cancelDocScanning(job: string): Promise<chrome.documentScan.CancelScanResponse<string>>
```

Cancels an ongoing document scan job.

<a name="closeDocScanner"></a>

### closeDocScanner

```
closeDocScanner(scannerHandle: string): Promise<chrome.documentScan.CloseScannerResponse<string>>
```

Closes the document scanner associated with the specified scanner handle.

<a name="getDocScannerOptionGroups"></a>

### getDocScannerOptionGroups

```
getDocScannerOptionGroups(scannerHandle: string): Promise<chrome.documentScan.GetOptionGroupsResponse<string>>
```

Retrieves the available option groups for the specified document scanner.

<a name="getDocScannerList"></a>

### getDocScannerList

```
getDocScannerList(filter: chrome.documentScan.DeviceFilter): Promise<chrome.documentScan.GetScannerListResponse>
```

Fetches a list of document scanners matching the given filter criteria.

<a name="openDocScanner"></a>

### openDocScanner

```
openDocScanner(scannerId: string): Promise<chrome.documentScan.OpenScannerResponse<string>>
```

Opens a document scanner by its ID, returning a handle for further operations.

<a name="readDocScanningData"></a>

### readDocScanningData

```
readDocScanningData(job: string): Promise<chrome.documentScan.ReadScanDataResponse<string>>
```

Reads the next chunk of data from an ongoing scan job. Note: A successful response with zero-length data indicates the scanner is still working; try again shortly. When the job completes, the response `result` will be `EOF` and may contain a final data chunk.

<a name="docScanning"></a>

### docScanning

```
docScanning(options: chrome.documentScan.ScanOptions): Promise<chrome.documentScan.ScanResults>
```

Performs a one-shot document scan with the specified options and returns the results.

<a name="setDocScannerOptions"></a>

### setDocScannerOptions

```
setDocScannerOptions(
  scannerHandle: string,
  options: chrome.documentScan.OptionSetting[]
): Promise<chrome.documentScan.SetOptionsResponse<string>>
```

Sets multiple scanner options on the given scanner handle.

<a name="startDocScanning"></a>

### startDocScanning

```
startDocScanning(
  scannerHandle: string,
  options: chrome.documentScan.StartScanOptions
): Promise<chrome.documentScan.StartScanResponse<string>>
```

Starts a scan on an open scanner using the provided options and returns a job handle.
