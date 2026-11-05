export function renderBasicAvailability({namespace}) {
    return {
        imports: ['import {browser} from "../browser";'],
        expression: `browser().${namespace}`,
        methodType: `typeof chrome.${namespace}`,
    };
}
