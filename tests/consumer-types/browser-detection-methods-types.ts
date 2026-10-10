import {BrowserFamily, type BrowserGuess, BrowserGuessSource, BrowserName, guessBrowser, isBrowser, isBrowserFamily} from "@addon-core/browser";

const methods = {guessBrowser, isBrowser, isBrowserFamily};

type Expected = {
    guessBrowser: () => Promise<BrowserGuess>;
    isBrowser: (guess: BrowserGuess, ...names: BrowserName[]) => boolean;
    isBrowserFamily: (guess: BrowserGuess, family: BrowserFamily) => boolean;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
void [methods, signaturesUnchanged];

const guess: BrowserGuess = {name: BrowserName.Chrome, family: BrowserFamily.Chromium, source: BrowserGuessSource.UserAgent};
const match: boolean = isBrowser(guess, BrowserName.Chrome);
void match;
// @ts-expect-error Browser names retain their enum type.
isBrowser(guess, "chrome");
