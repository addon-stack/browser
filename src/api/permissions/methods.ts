import {browser} from "../browser";
import {callWithPromise} from "../utils";

type AddHostAccessRequest = chrome.permissions.AddHostAccessRequest;
type RemoveHostAccessRequest = chrome.permissions.RemoveHostAccessRequest;
type Permissions = chrome.permissions.Permissions;

const permissions = () => browser().permissions;

// Methods
export const addHostAccessRequest = (request?: AddHostAccessRequest): Promise<void> =>
    callWithPromise(cb => permissions().addHostAccessRequest(request || {}, cb));

export const containsPermissions = (permission: Permissions): Promise<boolean> =>
    callWithPromise(cb => permissions().contains(permission, cb));

export const getAllPermissions = (): Promise<Permissions> => callWithPromise(cb => permissions().getAll(cb));

export const removePermissions = (permission: Permissions): Promise<boolean> =>
    callWithPromise(cb => permissions().remove(permission, cb));

export const removeHostAccessRequest = (request?: RemoveHostAccessRequest): Promise<void> =>
    callWithPromise(cb => permissions().removeHostAccessRequest(request || {}, cb));

export const requestPermissions = (permission: Permissions): Promise<boolean> =>
    callWithPromise(cb => permissions().request(permission, cb));
