import {getDownloadValidationDelayKey, nativeDownloadValidationDelay} from "../internal/download-validation";
import {type BrowserMethod, createBrowserMethod} from "./method";

export interface BrowserDelaysHarness {
    readonly downloadValidation: BrowserMethod<(milliseconds: number) => Promise<void>, void>;
    reset(): void;
}

/** Delay controls are per harness and never replace the environment's timers. */
export const createBrowserDelaysHarness = (
    downloadsApis: readonly object[],
    nextSequence?: () => number
): BrowserDelaysHarness => {
    const downloadValidation = createBrowserMethod<(milliseconds: number) => Promise<void>, void>({
        implementation: nativeDownloadValidationDelay,
        invocation: "promise",
        name: "delays.downloadValidation",
        nextSequence,
    });

    const attach = (): void => {
        const key = getDownloadValidationDelayKey();

        for (const api of downloadsApis) {
            Object.defineProperty(api, key, {
                configurable: true,
                enumerable: false,
                value: downloadValidation.api,
                writable: true,
            });
        }
    };

    attach();

    return {
        downloadValidation,
        reset(): void {
            downloadValidation.setDefaultImplementation(nativeDownloadValidationDelay);
            downloadValidation.reset();
            attach();
        },
    };
};
