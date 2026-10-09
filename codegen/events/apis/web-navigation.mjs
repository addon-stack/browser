export default {
    namespace: "webNavigation",
    template: "web-navigation",
    events: {
        onWebNavigationBeforeNavigate: "onBeforeNavigate",
        onWebNavigationCommitted: "onCommitted",
        onWebNavigationCompleted: "onCompleted",
        onWebNavigationCreatedNavigationTarget: "onCreatedNavigationTarget",
        onWebNavigationDOMContentLoaded: "onDOMContentLoaded",
        onWebNavigationErrorOccurred: "onErrorOccurred",
        onWebNavigationHistoryStateUpdated: "onHistoryStateUpdated",
        onWebNavigationReferenceFragmentUpdated: "onReferenceFragmentUpdated",
        onWebNavigationTabReplaced: {event: "onTabReplaced", template: "basic"},
    },
};
