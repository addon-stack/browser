export default {
    namespace: "webRequest",
    template: "web-request",
    events: {
        onWebRequestAuthRequired: "onAuthRequired",
        onWebRequestBeforeRedirect: "onBeforeRedirect",
        onWebRequestBeforeRequest: "onBeforeRequest",
        onWebRequestBeforeSendHeaders: "onBeforeSendHeaders",
        onWebRequestCompleted: "onCompleted",
        onWebRequestErrorOccurred: "onErrorOccurred",
        onWebRequestHeadersReceived: "onHeadersReceived",
        onWebRequestResponseStarted: "onResponseStarted",
        onWebRequestSendHeaders: "onSendHeaders",
    },
};
