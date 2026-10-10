export default {
    namespace: "tabGroups",
    template: "basic",
    typeImports: ["TabGroup", "TabGroupRemoveInfo"],
    events: {
        onTabGroupCreated: {event: "onCreated", callbackType: "(group: TabGroup) => void"},
        onTabGroupUpdated: {event: "onUpdated", callbackType: "(group: TabGroup) => void"},
        onTabGroupMoved: {event: "onMoved", callbackType: "(group: TabGroup) => void"},
        onTabGroupRemoved: {
            event: "onRemoved",
            callbackType: "(group: TabGroup, removeInfo?: TabGroupRemoveInfo) => void",
        },
    },
};
