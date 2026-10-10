export function renderActionEvent({exportName, eventName}) {
    return {
        utilities: ["handleListener"],
        imports: ['import {type Action, action} from "./api";'],
        source: `export const ${exportName} = (
    callback: Parameters<typeof chrome.action.${eventName}.addListener>[0]
): (() => void) => {
    return handleListener(action<Action>().${eventName}, callback);
};`,
    };
}
