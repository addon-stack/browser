import {getDefaultPopup} from "@addon-core/browser";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signatureMatches: Equal<typeof getDefaultPopup, () => string | undefined> = true;
const popup = getDefaultPopup();

// @ts-expect-error The manifest may not configure a default popup.
const requiredPopup: string = popup;
// @ts-expect-error String methods require narrowing the optional result first.
popup.toUpperCase();

if (popup !== undefined) {
    const configuredPopup: string = popup;
    const uppercasePopup: string = popup.toUpperCase();
    void [configuredPopup, uppercasePopup];
}

void [signatureMatches, requiredPopup];
