import {browser} from "../browser";
import {callWithPromise} from "../utils";

type GetFrameDetails = chrome.webNavigation.GetFrameDetails;
type GetFrameResultDetails = chrome.webNavigation.GetFrameResultDetails;
type GetAllFrameResultDetails = chrome.webNavigation.GetAllFrameResultDetails;

const webNavigation = () => browser().webNavigation;

// Methods
export const getAllFrames = (tabId: number): Promise<GetAllFrameResultDetails[]> =>
    callWithPromise(cb => webNavigation().getAllFrames({tabId}, frames => cb(frames || [])));

export const getFrame = (details: GetFrameDetails): Promise<GetFrameResultDetails | null> =>
    callWithPromise(cb => webNavigation().getFrame(details, cb));
