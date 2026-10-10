import {
    onWebNavigationBeforeNavigate,
    onWebNavigationCommitted,
    onWebNavigationCompleted,
    onWebNavigationCreatedNavigationTarget,
    onWebNavigationDOMContentLoaded,
    onWebNavigationErrorOccurred,
    onWebNavigationHistoryStateUpdated,
    onWebNavigationReferenceFragmentUpdated,
    onWebNavigationTabReplaced,
} from "@addon-core/browser";

type NativeArguments = {
    onWebNavigationBeforeNavigate: Parameters<typeof chrome.webNavigation.onBeforeNavigate.addListener>;
    onWebNavigationCommitted: Parameters<typeof chrome.webNavigation.onCommitted.addListener>;
    onWebNavigationCompleted: Parameters<typeof chrome.webNavigation.onCompleted.addListener>;
    onWebNavigationCreatedNavigationTarget: Parameters<typeof chrome.webNavigation.onCreatedNavigationTarget.addListener>;
    onWebNavigationDOMContentLoaded: Parameters<typeof chrome.webNavigation.onDOMContentLoaded.addListener>;
    onWebNavigationErrorOccurred: Parameters<typeof chrome.webNavigation.onErrorOccurred.addListener>;
    onWebNavigationHistoryStateUpdated: Parameters<typeof chrome.webNavigation.onHistoryStateUpdated.addListener>;
    onWebNavigationReferenceFragmentUpdated: Parameters<typeof chrome.webNavigation.onReferenceFragmentUpdated.addListener>;
    onWebNavigationTabReplaced: Parameters<typeof chrome.webNavigation.onTabReplaced.addListener>;
};

const wrappers = {
    onWebNavigationBeforeNavigate,
    onWebNavigationCommitted,
    onWebNavigationCompleted,
    onWebNavigationCreatedNavigationTarget,
    onWebNavigationDOMContentLoaded,
    onWebNavigationErrorOccurred,
    onWebNavigationHistoryStateUpdated,
    onWebNavigationReferenceFragmentUpdated,
    onWebNavigationTabReplaced,
};

type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const filter: chrome.webNavigation.WebNavigationEventFilter = {url: [{hostEquals: "example.test"}]};

onWebNavigationCommitted(details => {
    const type: string = details.transitionType; void type;
}, filter);

onWebNavigationCompleted(() => undefined);
onWebNavigationBeforeNavigate(() => undefined, undefined);

onWebNavigationTabReplaced(details => {
    const id: number = details.replacedTabId; void id;
});

// @ts-expect-error Navigation filters require URL conditions.
onWebNavigationCompleted(() => undefined, {});
// @ts-expect-error Request URL-pattern filters are not navigation filters.
onWebNavigationCompleted(() => undefined, {urls: ["https://example.test/*"]});
// @ts-expect-error Tab replacement does not accept a filter.
onWebNavigationTabReplaced(() => undefined, filter);
// @ts-expect-error Listener details retain their native event-specific shape.
onWebNavigationErrorOccurred((_details: string) => undefined);
