export default {
    namespace: "notifications",
    template: "basic",
    events: {
        onNotificationsButtonClicked: "onButtonClicked",
        onNotificationsClicked: "onClicked",
        onNotificationsClosed: "onClosed",
        onNotificationsPermissionLevelChanged: "onPermissionLevelChanged",
    },
};
