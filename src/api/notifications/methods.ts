import {browser} from "../browser";
import {callWithPromise} from "../utils";

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
