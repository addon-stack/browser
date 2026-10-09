import {browser} from "../browser";
import {callWithPromise} from "../utils";

type CreateProperties = chrome.contextMenus.CreateProperties;

const contextMenus = () => browser().contextMenus;

// Methods
export const createContextMenus = (createProperties?: CreateProperties): Promise<void> =>
    callWithPromise(cb => contextMenus().create(createProperties || {}, cb));

export const removeContextMenus = (menuItemId: string | number): Promise<void> =>
    callWithPromise(cb => contextMenus().remove(menuItemId, cb));

export const removeAllContextMenus = (): Promise<void> => callWithPromise(cb => contextMenus().removeAll(cb));

export const updateContextMenus = (
    id: string | number,
    updateProperties?: Omit<CreateProperties, "id">
): Promise<void> => callWithPromise(cb => contextMenus().update(id, updateProperties || {}, cb));

// Custom Methods
export const createOrUpdateContextMenu = async (
    id: string | number,
    properties: Omit<CreateProperties, "id">
): Promise<void> => {
    try {
        await createContextMenus({...properties, id: id.toString()});
    } catch {
        await updateContextMenus(id, properties);
    }
};
