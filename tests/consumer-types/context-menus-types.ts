import {createContextMenus, createOrUpdateContextMenu, updateContextMenus} from "@addon-core/browser";

const created: Promise<void> = createContextMenus({id: "open", title: "Open"});
const normal: Promise<void> = createContextMenus({type: "normal", title: "Open"});
const checkbox: Promise<void> = createContextMenus({type: "checkbox", title: "Enabled", checked: true});
const radio: Promise<void> = createContextMenus({type: "radio", title: "Mode A"});
const separator: Promise<void> = createContextMenus({type: "separator"});
const titledSeparator: Promise<void> = createContextMenus({type: "separator", title: "Section"});

const upserted: Promise<void> = createOrUpdateContextMenu(7, {title: "Open"});
const upsertedCheckbox: Promise<void> = createOrUpdateContextMenu("enabled", {type: "checkbox", title: "Enabled"});
const upsertedRadio: Promise<void> = createOrUpdateContextMenu("mode", {type: "radio", title: "Mode A"});
const upsertedSeparator: Promise<void> = createOrUpdateContextMenu("separator", {type: "separator"});

declare const nativeProperties: chrome.contextMenus.CreateProperties;
createContextMenus(nativeProperties);
createOrUpdateContextMenu("native", nativeProperties);

// @ts-expect-error Creation requires a properties argument.
createContextMenus();
// @ts-expect-error Undefined is not a valid creation argument.
createContextMenus(undefined);
// @ts-expect-error A default normal item requires a title.
createContextMenus({});
// @ts-expect-error A normal item requires a title.
createContextMenus({type: "normal"});
// @ts-expect-error A checkbox requires a title.
createContextMenus({type: "checkbox"});
// @ts-expect-error A radio item requires a title.
createContextMenus({type: "radio"});

// @ts-expect-error Upsert requires creation properties.
createOrUpdateContextMenu("item");
// @ts-expect-error A default normal item requires a title even for upsert.
createOrUpdateContextMenu("item", {});
// @ts-expect-error A normal item requires a title even for upsert.
createOrUpdateContextMenu("item", {type: "normal"});
// @ts-expect-error A checkbox requires a title even for upsert.
createOrUpdateContextMenu("item", {type: "checkbox"});
// @ts-expect-error A radio item requires a title even for upsert.
createOrUpdateContextMenu("item", {type: "radio"});
// @ts-expect-error The ID is a separate upsert argument.
createOrUpdateContextMenu("item", {id: "other", title: "Open"});

declare const ambiguousProperties: {type: "normal" | "separator"; title?: string};
// @ts-expect-error Upsert must preserve the relationship between item type and title.
createOrUpdateContextMenu("ambiguous", ambiguousProperties);

const updated: Promise<void> = updateContextMenus("item", {enabled: false});
updateContextMenus(7, {checked: true});
updateContextMenus("item", {type: "normal"});
updateContextMenus("item", {});
updateContextMenus("item");

void [created, normal, checkbox, radio, separator, titledSeparator, upserted, upsertedCheckbox, upsertedRadio, upsertedSeparator, updated];
