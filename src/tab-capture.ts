import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type CaptureInfo = chrome.tabCapture.CaptureInfo;
type CaptureOptions = chrome.tabCapture.CaptureOptions;
type GetMediaStreamOptions = chrome.tabCapture.GetMediaStreamOptions;

const tabCapture = () => browser().tabCapture;

// Methods
export const createTabCapture = (options: CaptureOptions): Promise<MediaStream | null> =>
    callWithPromise(cb => tabCapture().capture(options, cb));

export const getCapturedTabs = (): Promise<CaptureInfo[]> => callWithPromise(cb => tabCapture().getCapturedTabs(cb));

export const getCaptureMediaStreamId = (options: GetMediaStreamOptions): Promise<string> =>
    callWithPromise(cb => tabCapture().getMediaStreamId(options, cb));

// Events
export const onCaptureStatusChanged = (
    callback: Parameters<typeof chrome.tabCapture.onStatusChanged.addListener>[0]
): (() => void) => {
    return handleListener(tabCapture().onStatusChanged, callback);
};
