// Internal, environment-independent subset shared by URL matching and host-permission containment.
// Deliberately not exported from either public entrypoint. See docs/testing/match-patterns.md.
type Scheme = "http" | "https" | "file";
type Host = {readonly kind: "any" | "exact" | "subdomains"; readonly name: string};

export interface MatchPattern {
    readonly schemes: readonly Scheme[];
    readonly host: Host;
    readonly port: string;
    readonly path: string;
    readonly pathParts: readonly string[];
}

const supportedSchemes: readonly Scheme[] = ["http", "https", "file"];
const stripTrailingDots = (host: string): string => host.replace(/\.+$/, "");
const isIpAddress = (host: string): boolean => host.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(host);

const patternError = (pattern: string, api: string, reason: string, unsupported = false): Error =>
    new Error(
        `${unsupported ? "Unsupported" : "Invalid"} match pattern ${JSON.stringify(pattern)} for ${api}: ${reason}`
    );

export const parseMatchPattern = (pattern: string, api: string): MatchPattern => {
    if (pattern === "<all_urls>") {
        return {
            schemes: [...supportedSchemes],
            host: {kind: "any", name: ""},
            port: "*",
            path: "/*",
            pathParts: ["/", ""],
        };
    }

    if (typeof pattern !== "string" || /[\s\\#]/u.test(pattern)) {
        throw patternError(pattern, api, "expected a string without whitespace, backslashes or a fragment");
    }

    const parts = /^([^:]+):\/\/([^/]*)(\/.*)$/.exec(pattern);

    if (!parts) throw patternError(pattern, api, "expected <scheme>://<host>/<path>");

    const [, scheme, authority, path] = parts;

    if (scheme !== "*" && !supportedSchemes.includes(scheme as Scheme)) {
        throw patternError(pattern, api, "supported schemes are http, https, file and * (http/https)", true);
    }

    // URL.pathname/search are serialized. Do not silently pretend to implement vendor-specific decoding rules.
    if (/[^\x21-\x7e]/u.test(path)) {
        throw patternError(pattern, api, "use percent-encoded non-ASCII path/query characters", true);
    }

    const schemes: readonly Scheme[] = scheme === "*" ? ["http", "https"] : [scheme as Scheme];
    const base = {schemes, path, pathParts: path.split("*")};

    if (scheme === "file") {
        if (authority) throw patternError(pattern, api, "only hostless file:/// patterns are supported", true);

        return {...base, host: {kind: "any", name: ""}, port: "*"};
    }

    const hostPort = /^(\[[^\]]+\]|[^:]+)(?::([^:]*))?$/.exec(authority);

    if (!hostPort) throw patternError(pattern, api, "missing or malformed host/port");

    const [, hostText, portText = "*"] = hostPort;

    if (portText !== "*" && (!/^\d+$/.test(portText) || Number(portText) > 65535)) {
        throw patternError(pattern, api, "port must be * or an integer from 0 to 65535");
    }

    if (portText !== "*" && portText !== String(Number(portText))) {
        throw patternError(pattern, api, "use a canonical decimal port without leading zeroes", true);
    }

    if (scheme === "*" && portText !== "*") {
        throw patternError(pattern, api, "an explicit port requires an explicit http or https scheme", true);
    }

    const port = portText === "*" ? "*" : String(Number(portText));

    if (hostText === "*") return {...base, host: {kind: "any", name: ""}, port};

    const subdomains = hostText.startsWith("*.");
    const rawHost = subdomains ? hostText.slice(2) : hostText;

    if (!rawHost || /[*@?#%]/.test(rawHost)) throw patternError(pattern, api, "invalid host or host wildcard");

    let name: string;

    try {
        // URL provides case/IDNA/IP normalization; no hand-written general URL parser or Node-only dependency.
        name = stripTrailingDots(new URL(`http://${rawHost}/`).hostname);
    } catch {
        throw patternError(pattern, api, "invalid hostname");
    }

    if (!name) throw patternError(pattern, api, "empty hostname");

    if (subdomains && isIpAddress(name)) {
        throw patternError(pattern, api, "subdomain wildcards on IP addresses are not supported", true);
    }

    return {...base, host: {kind: subdomains ? "subdomains" : "exact", name}, port};
};

const matchesHost = (host: Host, name: string): boolean =>
    host.kind === "any" ||
    name === host.name ||
    (host.kind === "subdomains" && !isIpAddress(name) && name.endsWith(`.${host.name}`));

const matchesPath = (pattern: MatchPattern, value: string): boolean => {
    // Chromium also matches /foo/* against /foo, not only /foo/ and its descendants.
    if (pattern.path.endsWith("/*") && value === pattern.path.slice(0, -2)) return true;

    const parts = pattern.pathParts;

    if (parts.length === 1) return value === parts[0];

    if (!value.startsWith(parts[0])) return false;

    let offset = parts[0].length;

    // Literal segments avoid regex injection and backtracking over user-supplied patterns.
    for (const part of parts.slice(1, -1)) {
        const next = value.indexOf(part, offset);

        if (next === -1) return false;

        offset = next + part.length;
    }

    const suffix = parts[parts.length - 1];

    return value.length - suffix.length >= offset && value.endsWith(suffix);
};

export const matchesUrl = (pattern: MatchPattern, value: URL): boolean => {
    const scheme = value.protocol.slice(0, -1) as Scheme;

    if (!pattern.schemes.includes(scheme)) return false;

    const port = value.port || (scheme === "https" ? "443" : scheme === "http" ? "80" : "");
    // URL.search is empty for both no query and a bare '?'; the serialized URL preserves the distinction.
    const query = value.search || (value.href.split("#", 1)[0].endsWith("?") ? "?" : "");

    return (
        matchesHost(pattern.host, stripTrailingDots(value.hostname)) &&
        (pattern.port === "*" || pattern.port === port) &&
        matchesPath(pattern, value.pathname + query)
    );
};

export const createUrlMatcher = (patterns: readonly string[], api: string): ((url: string) => boolean) => {
    // Compile/validate every alternative, even with zero tabs or an earlier <all_urls> alternative.
    const parsed = patterns.map(pattern => parseMatchPattern(pattern, api));

    return (value: string): boolean => {
        let url: URL;

        try {
            url = new URL(value);
        } catch {
            return false;
        }

        return parsed.some(pattern => matchesUrl(pattern, url));
    };
};

export const coversOrigin = (granted: MatchPattern, requested: MatchPattern): boolean => {
    // This is set containment, not matching a representative URL. Host permission paths are ignored.
    if (!requested.schemes.every(scheme => granted.schemes.includes(scheme))) return false;

    if (granted.port !== "*" && granted.port !== requested.port) return false;

    if (granted.host.kind === "any") return true;

    if (requested.host.kind === "any") return false;

    if (requested.host.kind === "subdomains" && granted.host.kind !== "subdomains") return false;

    return matchesHost(granted.host, requested.host.name);
};

export const parseOrigins = (origins: readonly string[] | undefined, api: string): MatchPattern[] =>
    (origins ?? []).map(origin => parseMatchPattern(origin, api));
