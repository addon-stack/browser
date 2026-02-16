import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type Tab = chrome.tabs.Tab;
type Port = chrome.runtime.Port;
type Window = chrome.windows.Window;

type ZoomSettings = chrome.tabs.ZoomSettings;

type QueryInfo = chrome.tabs.QueryInfo;
type ConnectInfo = chrome.tabs.ConnectInfo;
type HighlightInfo = chrome.tabs.HighlightInfo;

type GroupOptions = chrome.tabs.GroupOptions;

type MoveProperties = chrome.tabs.MoveProperties;
type UpdateProperties = chrome.tabs.UpdateProperties;
type CreateProperties = chrome.tabs.CreateProperties;

type ImageDetails = chrome.extensionTypes.ImageDetails;
type InjectDetails = chrome.extensionTypes.InjectDetails;

type MessageSendOptions = chrome.tabs.MessageSendOptions;

const tabs = () => browser().tabs as typeof chrome.tabs;

// Methods
export const captureVisibleTab = (windowId: number, options: ImageDetails): Promise<string> =>
    callWithPromise(cb => tabs().captureVisibleTab(windowId, options, cb));

export const connectTab = (tabId: number, connectInfo?: ConnectInfo): Port => tabs().connect(tabId, connectInfo);

export const createTab = (properties: CreateProperties): Promise<Tab> =>
    callWithPromise(cb => tabs().create(properties, cb));

export const detectTabLanguage = (tabId: number): Promise<string> =>
    callWithPromise(cb => tabs().detectLanguage(tabId, cb));

export const discardTab = (tabId: number): Promise<Tab | undefined> => callWithPromise(cb => tabs().discard(tabId, cb));

export const duplicateTab = (tabId: number): Promise<Tab | undefined> =>
    callWithPromise(cb => tabs().duplicate(tabId, cb));

export const getTab = (tabId: number): Promise<Tab> => callWithPromise(cb => tabs().get(tabId, cb));

export const getCurrentTab = (): Promise<Tab | undefined> => callWithPromise(cb => tabs().getCurrent(cb));

export const getTabZoom = (tabId: number): Promise<number> => callWithPromise(cb => tabs().getZoom(tabId, cb));

export const getTabZoomSettings = (tabId: number): Promise<ZoomSettings> =>
    callWithPromise(cb => tabs().getZoomSettings(tabId, cb));

export const goTabBack = (tabId: number): Promise<void> => callWithPromise(cb => tabs().goBack(tabId, () => cb()));

export const goTabForward = (tabId: number): Promise<void> =>
    callWithPromise(cb => tabs().goForward(tabId, () => cb()));

export const groupTabs = (options: GroupOptions): Promise<number> => callWithPromise(cb => tabs().group(options, cb));

export const highlightTab = (highlightInfo: HighlightInfo): Promise<Window> =>
    callWithPromise(cb => tabs().highlight(highlightInfo, cb));

export const moveTab = (tabId: number, moveProperties: MoveProperties): Promise<Tab> =>
    callWithPromise(cb => tabs().move(tabId, moveProperties, cb));

export const moveTabs = (tabIds: number[], moveProperties: MoveProperties): Promise<Tab[]> =>
    callWithPromise(cb => tabs().move(tabIds, moveProperties, cb));

export const queryTabs = (queryInfo?: QueryInfo): Promise<Tab[]> =>
    callWithPromise(cb => tabs().query(queryInfo || {}, cb));

export const reloadTab = (tabId: number, bypassCache?: boolean | undefined): Promise<void> =>
    callWithPromise(cb => tabs().reload(tabId, {bypassCache}, () => cb()));

export const removeTab = (tabId: number): Promise<void> => callWithPromise(cb => tabs().remove(tabId, () => cb()));

export const sendTabMessage = <M = any, R = any>(
    tabId: number,
    message: M,
    options: MessageSendOptions = {}
): Promise<R> => callWithPromise(cb => tabs().sendMessage<M, R>(tabId, message, options, cb));

export const setTabZoom = (tabId: number, zoomFactor: number): Promise<void> =>
    callWithPromise(cb => tabs().setZoom(tabId, zoomFactor, () => cb()));

export const setTabZoomSettings = (tabId: number, zoomSettings: ZoomSettings): Promise<void> =>
    callWithPromise(cb => tabs().setZoomSettings(tabId, zoomSettings, () => cb()));

export const ungroupTab = (tabIds: number | [number, ...number[]]): Promise<void> =>
    callWithPromise(cb => tabs().ungroup(tabIds, () => cb()));

export const updateTab = (tabId: number, updateProperties: UpdateProperties): Promise<Tab | undefined> =>
    callWithPromise(cb => tabs().update(tabId, updateProperties, cb));

export const executeScriptTab = (tabId: number, details: InjectDetails): Promise<any[] | undefined> =>
    callWithPromise(cb => tabs().executeScript(tabId, details, cb));

export const insertCssTab = (tabId: number, details: InjectDetails): Promise<void> =>
    callWithPromise(cb => tabs().insertCSS(tabId, details, () => cb()));

export const removeCssTab = (tabId: number, details: InjectDetails): Promise<void> =>
    callWithPromise(cb => tabs().removeCSS(tabId, details, () => cb()));

// Custom Methods
export const getTabUrl = async (tabId: number): Promise<string> => {
    const tab = await findTabById(tabId);

    if (!tab) {
        throw new Error(`Tab id "${tabId}" not exist`);
    }

    const {url} = tab;

    if (!url) {
        throw new Error(`URL not exist by tab id ${tabId}`);
    }

    return url;
};

export const getActiveTab = async (): Promise<Tab> => {
    const tabs = await queryTabs({active: true, currentWindow: true});

    if (!tabs || !tabs[0]) {
        throw new Error("Tab not found");
    }

    return tabs[0];
};

export const queryTabIds = async (queryInfo?: QueryInfo): Promise<number[]> =>
    (await queryTabs(queryInfo)).reduce((ids, {id}) => {
        if (typeof id === "number") {
            ids.push(id);
        }

        return ids;
    }, [] as number[]);

export const findTab = async (queryInfo?: QueryInfo): Promise<Tab | undefined> => {
    const tabs = await queryTabs(queryInfo);

    return tabs.length ? tabs[0] : undefined;
};

export const findTabById = async (tabId: number): Promise<Tab | undefined> => {
    try {
        return getTab(tabId);
    } catch {
        return undefined;
    }
};

export const findTabByUrl = async (url: string): Promise<Tab | undefined> => {
    const tabs = await queryTabs({url});

    return tabs.length ? tabs[0] : undefined;
};

export const updateTabAsSelected = (tabId: number): Promise<Tab | undefined> => updateTab(tabId, {highlighted: true});

export const updateTabAsActive = (tabId: number): Promise<Tab | undefined> => updateTab(tabId, {active: true});

export const openOrCreateTab = async (tab: Tab): Promise<void> => {
    const {id, url} = tab;

    if (id && url) {
        const existTab = await findTab({url});

        if (existTab && id && existTab.id === id) {
            await updateTabAsSelected(id);

            return;
        }
    }

    await createTab({url});
};

export const openOrCreateTabByUrl = async (url: string): Promise<void> => {
    const tab = await findTabByUrl(url);

    if (tab?.id) {
        await updateTabAsSelected(tab.id);

        return;
    }

    await createTab({url});
};

// Events
export const onTabActivated = (callback: Parameters<typeof chrome.tabs.onActivated.addListener>[0]): (() => void) => {
    return handleListener(tabs().onActivated, callback);
};

export const onTabAttached = (callback: Parameters<typeof chrome.tabs.onAttached.addListener>[0]): (() => void) => {
    return handleListener(tabs().onAttached, callback);
};

export const onTabCreated = (callback: Parameters<typeof chrome.tabs.onCreated.addListener>[0]): (() => void) => {
    return handleListener(tabs().onCreated, callback);
};

export const onTabDetached = (callback: Parameters<typeof chrome.tabs.onDetached.addListener>[0]): (() => void) => {
    return handleListener(tabs().onDetached, callback);
};

export const onTabHighlighted = (
    callback: Parameters<typeof chrome.tabs.onHighlighted.addListener>[0]
): (() => void) => {
    return handleListener(tabs().onHighlighted, callback);
};

export const onTabMoved = (callback: Parameters<typeof chrome.tabs.onMoved.addListener>[0]): (() => void) => {
    return handleListener(tabs().onMoved, callback);
};

export const onTabRemoved = (callback: Parameters<typeof chrome.tabs.onRemoved.addListener>[0]): (() => void) => {
    return handleListener(tabs().onRemoved, callback);
};

export const onTabReplaced = (callback: Parameters<typeof chrome.tabs.onReplaced.addListener>[0]): (() => void) => {
    return handleListener(tabs().onReplaced, callback);
};

export const onTabUpdated = (callback: Parameters<typeof chrome.tabs.onUpdated.addListener>[0]): (() => void) => {
    return handleListener(tabs().onUpdated, callback);
};

export const onTabZoomChange = (callback: Parameters<typeof chrome.tabs.onZoomChange.addListener>[0]): (() => void) => {
    return handleListener(tabs().onZoomChange, callback);
};
