export function renderActionAvailability() {
    return {
        imports: ['import {action} from "./api";'],
        expression: "action()",
        methodType: "typeof chrome.action | typeof chrome.browserAction",
    };
}
