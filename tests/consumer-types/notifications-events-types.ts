import {
    onNotificationsButtonClicked,
    onNotificationsClicked,
    onNotificationsClosed,
    onNotificationsPermissionLevelChanged,
} from "@addon-core/browser";

type NativeArguments = {
    onNotificationsButtonClicked: Parameters<typeof chrome.notifications.onButtonClicked.addListener>;
    onNotificationsClicked: Parameters<typeof chrome.notifications.onClicked.addListener>;
    onNotificationsClosed: Parameters<typeof chrome.notifications.onClosed.addListener>;
    onNotificationsPermissionLevelChanged: Parameters<typeof chrome.notifications.onPermissionLevelChanged.addListener>;
};

const wrappers = {onNotificationsButtonClicked, onNotificationsClicked, onNotificationsClosed, onNotificationsPermissionLevelChanged};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onNotificationsButtonClicked((id, buttonIndex) => {
    const payload: [string, number] = [id, buttonIndex];
    void payload;
});

onNotificationsClosed((id, byUser) => {
    const payload: [string, boolean] = [id, byUser];
    void payload;
});

onNotificationsPermissionLevelChanged(level => {
    const permission: "granted" | "denied" = level;
    void permission;
});

unsubscribe();
// @ts-expect-error Notification IDs are strings.
onNotificationsClicked((_id: number) => undefined);
// @ts-expect-error Notification events do not accept a registration filter.
onNotificationsClicked(() => undefined, {});
// @ts-expect-error Button indexes are numbers.
onNotificationsButtonClicked((_id: string, _index: string) => undefined);
