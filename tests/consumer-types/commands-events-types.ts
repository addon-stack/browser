import {getAllCommands, onCommand, onSpecificCommand, onSpecificCommands} from "@addon-core/browser";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type NativeListener = Parameters<typeof chrome.commands.onCommand.addListener>[0];
const baseSignatureUnchanged: Equal<typeof onCommand, (callback: NativeListener) => () => void> = true;
const customSignatureUnchanged: Equal<typeof onSpecificCommand, (command: string, callback: (tab?: chrome.tabs.Tab) => any) => () => void> = true;
const methodSignatureUnchanged: Equal<typeof getAllCommands, () => Promise<chrome.commands.Command[]>> = true;
const mapSignature: Equal<typeof onSpecificCommands, (handlers: Record<string, (tab?: chrome.tabs.Tab) => any>) => () => void> = true;
void [baseSignatureUnchanged, customSignatureUnchanged, methodSignatureUnchanged, mapSignature];

const unsubscribe: () => void = onCommand((command, tab) => {
    const name: string = command;
    const optionalTab: chrome.tabs.Tab | undefined = tab;
    void [name, optionalTab];
});

const unsubscribeSpecific: () => void = onSpecificCommand("sync", async tab => {
    const id: number | undefined = tab?.id;

    return id;
});

const unsubscribeMap: () => void = onSpecificCommands({
    sync: async tab => {
        const optionalTab: chrome.tabs.Tab | undefined = tab;

        return optionalTab?.id;
    },
    cleanup: tab => {
        const id: number | undefined = tab?.id;
        void id;
    },
});

const unsubscribeEmptyMap: () => void = onSpecificCommands({});

unsubscribe();
unsubscribeSpecific();
unsubscribeMap();
unsubscribeEmptyMap();
// @ts-expect-error Basic command events accept no registration filter.
onCommand(() => undefined, {});
// @ts-expect-error Native listeners receive the command name first.
onCommand((_tab: chrome.tabs.Tab) => undefined);
// @ts-expect-error The command selector must be a string.
onSpecificCommand(7, () => undefined);
// @ts-expect-error Filtered listeners receive an optional tab, not a command name.
onSpecificCommand("sync", (_command: string) => undefined);
// @ts-expect-error A map of command handlers is required.
onSpecificCommands();
// @ts-expect-error Map values must be callbacks.
onSpecificCommands({sync: true});
// @ts-expect-error Each handler receives an optional tab, not a command name.
onSpecificCommands({sync: (_command: string) => undefined});
// @ts-expect-error A handler must accept events without a tab.
onSpecificCommands({sync: (_tab: chrome.tabs.Tab) => undefined});
// @ts-expect-error Map subscriptions take only the handler map.
onSpecificCommands({sync: () => undefined}, {});
