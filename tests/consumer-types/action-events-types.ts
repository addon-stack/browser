import {onActionClicked, onActionUserSettingsChanged} from "@addon-core/browser";

type NativeArguments = {
    onActionClicked: Parameters<typeof chrome.action.onClicked.addListener>;
    onActionUserSettingsChanged: Parameters<typeof chrome.action.onUserSettingsChanged.addListener>;
};

const wrappers = {onActionClicked, onActionUserSettingsChanged};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onActionClicked(tab => {
    const id: number | undefined = tab.id;
    void id;
});

onActionUserSettingsChanged(changes => {
    const isOnToolbar: boolean | undefined = changes.isOnToolbar;
    void isOnToolbar;
});

unsubscribe();
// @ts-expect-error Clicked listeners receive a Tab, not an ID.
onActionClicked((_id: number) => undefined);
// @ts-expect-error Action events do not accept a registration filter.
onActionClicked(() => undefined, {});
// @ts-expect-error Settings listeners receive their own native payload.
onActionUserSettingsChanged((_tab: chrome.tabs.Tab) => undefined);
