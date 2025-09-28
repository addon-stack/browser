import {browser} from "./browser";
import {handleListener} from "./utils";

const fileBrowserHandler = () => browser().fileBrowserHandler;

export const onFileBrowserHandlerExecute = (
    callback: Parameters<typeof chrome.fileBrowserHandler.onExecute.addListener>[0]
): (() => void) => {
    return handleListener(fileBrowserHandler().onExecute, callback);
};
