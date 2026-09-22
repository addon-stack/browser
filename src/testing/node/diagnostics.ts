export const nodeError = (message: string, cause?: unknown): Error => new Error(`Node script executor: ${message}`, {cause});

export const missingCoverageHelper = (source: string, name: string, message: string): string | undefined => {
    if (name !== "ReferenceError") return undefined;

    const helper = /^(cov_[\w$]+) is not defined$/.exec(message)?.[1];

    // Match an actual missing-helper failure, not a harmless mention in a string/comment or a locally bound function.
    return helper && [...source.matchAll(/\bcov_[\w$]+\s*\(\s*\)/g)].some(call => call[0].replace(/\s/g, "") === `${helper}()`)
        ? helper : undefined;
};

export const coverageError = (helper: string): Error => nodeError(`Istanbul coverage instrumentation references missing helper "${helper}" in injected func. Exclude the injected function module from instrumentation or provide uninstrumented source; coverage counters cannot access the test's closure.`);
