import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type NotificationOptions = chrome.notifications.NotificationOptions;
type NotificationCreateOptions = chrome.notifications.NotificationCreateOptions;

const notifications = () => browser().notifications;

// Methods
export const clearNotification = (notificationId: string): Promise<boolean> =>
    callWithPromise(cb => notifications().clear(notificationId, cb));

export const createNotification = (options: NotificationOptions, notificationId?: string): Promise<string> =>
    callWithPromise(cb => {
        const defaultOptions: NotificationCreateOptions = {
            type: "basic",
            title: "",
            message: "",
            iconUrl: "",
        };

        const finalOptions = {...defaultOptions, ...options};

        if (typeof notificationId === "string" && notificationId !== "") {
            notifications().create(notificationId, finalOptions, cb);
        } else {
            notifications().create(finalOptions, cb);
        }
    });

export const getAllNotifications = (): Promise<object> => callWithPromise(cb => notifications().getAll(cb));

export const getNotificationPermissionLevel = (): Promise<string> =>
    callWithPromise(cb => notifications().getPermissionLevel(cb));

export const updateNotification = (options: NotificationOptions, notificationId: string): Promise<boolean> =>
    callWithPromise(cb => notifications().update(notificationId, options, cb));

// Custom Methods
export const isAvailableNotifications = (): boolean => !!notifications();

export const clearAllNotifications = async (): Promise<void> => {
    const allNotificationIds = Object.keys(await getAllNotifications());

    const tasks = allNotificationIds.map((id: string) => clearNotification(id));

    await Promise.all(tasks);
};

// Events
export const onNotificationsButtonClicked = (
    callback: Parameters<typeof chrome.notifications.onButtonClicked.addListener>[0]
): (() => void) => {
    if (!isAvailableNotifications()) {
        console.warn("chrome.notifications API is not supported");

        return () => ({});
    }

    return handleListener(notifications().onButtonClicked, callback);
};

export const onNotificationsClicked = (
    callback: Parameters<typeof chrome.notifications.onClicked.addListener>[0]
): (() => void) => {
    if (!isAvailableNotifications()) {
        console.warn("chrome.notifications API is not supported");

        return () => ({});
    }

    return handleListener(notifications().onClicked, callback);
};

export const onNotificationsClosed = (
    callback: Parameters<typeof chrome.notifications.onClosed.addListener>[0]
): (() => void) => {
    if (!isAvailableNotifications()) {
        console.warn("chrome.notifications API is not supported");

        return () => ({});
    }

    return handleListener(notifications().onClosed, callback);
};

export const onNotificationsPermissionLevelChanged = (
    callback: Parameters<typeof chrome.notifications.onPermissionLevelChanged.addListener>[0]
): (() => void) => {
    if (!isAvailableNotifications()) {
        console.warn("chrome.notifications API is not supported");

        return () => ({});
    }

    return handleListener(notifications().onPermissionLevelChanged, callback);
};
