import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type AudioDeviceInfo = chrome.audio.AudioDeviceInfo;
type DeviceFilter = chrome.audio.DeviceFilter;
type DeviceIdLists = chrome.audio.DeviceIdLists;
type DeviceProperties = chrome.audio.DeviceProperties;
type StreamType = chrome.audio.StreamType;

const audio = () => browser().audio;

// Methods
export const getAudioDevices = (filter?: DeviceFilter): Promise<AudioDeviceInfo[]> =>
    callWithPromise(cb => audio().getDevices(filter || {}, cb));

export const getAudioMute = (streamType: StreamType): Promise<boolean> =>
    callWithPromise(cb => audio().getMute(streamType, cb));

export const setAudioActiveDevices = (ids?: DeviceIdLists): Promise<void> =>
    callWithPromise(cb => audio().setActiveDevices(ids || {}, cb));

export const setAudioMute = (streamType: StreamType, isMuted: boolean): Promise<void> =>
    callWithPromise(cb => audio().setMute(streamType, isMuted, cb));

export const setAudioProperties = (id: string, properties?: DeviceProperties): Promise<void> =>
    callWithPromise(cb => audio().setProperties(id, properties || {}, cb));

// Events
export const onAudioDeviceListChanged = (
    callback: Parameters<typeof chrome.audio.onDeviceListChanged.addListener>[0]
): (() => void) => {
    return handleListener(audio().onDeviceListChanged, callback);
};

export const onAudioLevelChanged = (
    callback: Parameters<typeof chrome.audio.onLevelChanged.addListener>[0]
): (() => void) => {
    return handleListener(audio().onLevelChanged, callback);
};

export const onAudioMuteChanged = (
    callback: Parameters<typeof chrome.audio.onMuteChanged.addListener>[0]
): (() => void) => {
    return handleListener(audio().onMuteChanged, callback);
};
