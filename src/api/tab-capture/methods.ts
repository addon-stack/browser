import {browser} from "../browser";
import {callWithPromise} from "../utils";

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
