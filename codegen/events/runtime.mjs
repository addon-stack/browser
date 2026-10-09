export default {
    namespace: "runtime",
    template: "basic",
    events: {
        onConnect: "onConnect",
        onConnectExternal: "onConnectExternal",
        onInstalled: "onInstalled",
        onMessage: "onMessage",
        onMessageExternal: "onMessageExternal",
        onRestartRequired: "onRestartRequired",
        onStartup: "onStartup",
        onSuspend: "onSuspend",
        onSuspendCanceled: "onSuspendCanceled",
        onUpdateAvailable: "onUpdateAvailable",
        onUserScriptConnect: "onUserScriptConnect",
        onUserScriptMessage: "onUserScriptMessage",
    },
};
