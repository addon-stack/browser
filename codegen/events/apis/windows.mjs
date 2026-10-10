export default {
    namespace: "windows",
    template: "windows",
    events: {
        onWindowBoundsChanged: {event: "onBoundsChanged", template: "basic"},
        onWindowCreated: "onCreated",
        onWindowFocusChanged: "onFocusChanged",
        onWindowRemoved: "onRemoved",
    },
};
