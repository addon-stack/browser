import {onAudioDeviceListChanged, onAudioLevelChanged, onAudioMuteChanged} from "@addon-core/browser";

type NativeArguments = {
    onAudioDeviceListChanged: Parameters<typeof chrome.audio.onDeviceListChanged.addListener>;
    onAudioLevelChanged: Parameters<typeof chrome.audio.onLevelChanged.addListener>;
    onAudioMuteChanged: Parameters<typeof chrome.audio.onMuteChanged.addListener>;
};

const wrappers = {onAudioDeviceListChanged, onAudioLevelChanged, onAudioMuteChanged};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onAudioDeviceListChanged(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onAudioDeviceListChanged(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onAudioDeviceListChanged((_payload: number) => undefined);
