import {browser} from "./browser";
import {handleListener} from "./utils";
import {throwRuntimeError} from "./runtime";

type CreateProperties = chrome.contextMenus.CreateProperties;

const contextMenus = () => browser().contextMenus;

// Methods
export const createContextMenus = (createProperties?: CreateProperties): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        contextMenus().create(createProperties || {}, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

export const removeContextMenus = (menuItemId: string | number): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        contextMenus().remove(menuItemId, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

export const removeAllContextMenus = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        contextMenus().removeAll(() => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

export const updateContextMenus = (
    id: string | number,
    updateProperties?: Omit<CreateProperties, "id">
): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        contextMenus().update(id, updateProperties || {}, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

// Events
export const onContextMenusClicked = (
    callback: Parameters<typeof chrome.contextMenus.onClicked.addListener>[0]
): (() => void) => {
    return handleListener(contextMenus().onClicked, callback);
};
