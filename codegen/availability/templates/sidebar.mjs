export function renderSidebarAvailability() {
    return {
        imports: ['import {sidebarAction, sidePanel} from "./api";'],
        expression: "sidePanel() || sidebarAction()",
    };
}
