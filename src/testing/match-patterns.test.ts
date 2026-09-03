import {describe, expect, test} from "@jest/globals";
import {coversOrigin, createUrlMatcher, parseMatchPattern} from "./match-patterns";

describe("URL match-pattern subset", () => {
    test.each([
        ["*://example.com/*", "http://example.com/", true],
        ["*://example.com/*", "https://example.com/", true],
        ["*://example.com/*", "ftp://example.com/", false],
        ["*://*/*", "file:///tmp/test.html", false],
        ["<all_urls>", "file:///tmp/test.html", true],
        ["<all_urls>", "https://example.com/", true],
        ["<all_urls>", "http://example.com/", true],
        ["<all_urls>", "chrome://extensions/", false],
        ["<all_urls>", "about:blank", false],
        ["<all_urls>", "data:text/plain,hello", false],
        ["<all_urls>", "ws://example.com/", false],
        ["<all_urls>", "not a URL", false],
        ["https://*.example.com/*", "https://example.com/", true],
        ["https://*.example.com/*", "https://a.b.example.com/", true],
        ["https://*.example.com/*", "https://example.com.evil.test/", false],
        ["https://*.example.com/*", "https://notexample.com/", false],
        ["https://example.com/*", "https://sub.example.com/", false],
        ["https://EXAMPLE.com/*", "https://example.COM./", true],
        ["https://bücher.example/*", "https://xn--bcher-kva.example/", true],
        ["http://127.0.0.1/*", "http://127.0.0.1:62778/page", true],
        ["http://localhost:*/*", "http://localhost:3000/", true],
        ["http://localhost:3000/*", "http://localhost:3001/", false],
        ["http://localhost:3000/*", "http://localhost:3000/", true],
        ["http://localhost:80/*", "http://localhost/", true],
        ["https://localhost:443/*", "https://localhost/", true],
        ["http://[::1]/*", "http://[::1]:62778/page", true],
        ["http://[0:0:0:0:0:0:0:1]:80/*", "http://[::1]/", true],
        ["http://[::1]:1234/*", "http://[::1]:1235/", false],
        ["http://*/*", "http://127.0.0.1/", true],
        ["file:///tmp/*", "file:///tmp/test.html#fragment", true],
        ["file:///tmp/*", "file:///other/test.html", false],
        ["https://example.com/foo/*", "https://example.com/foo", true],
        ["https://example.com/foo/*", "https://example.com/foobar", false],
        ["https://example.com/foo*bar", "https://example.com/foobar", true],
        ["https://example.com/foo*bar", "https://example.com/foo/a/bar", true],
        ["https://example.com/foo*bar", "https://example.com/foo/a/bar/more", false],
        ["https://example.com/a*b*c", "https://example.com/aXXbYYc", true],
        ["https://example.com/a**b*c", "https://example.com/abc", true],
        ["https://example.com/aa*aa", "https://example.com/aaa", false],
        ["https://example.com/aa*aa", "https://example.com/aaaa", true],
        ["https://example.com/a+b.(c)[d]$", "https://example.com/a+b.(c)[d]$", true],
        ["https://example.com/a+b", "https://example.com/aaab", false],
        ["https://example.com/search?q=a+b", "https://example.com/search?q=a+b#part", true],
        ["https://example.com/search?q=*", "https://example.com/search?q=test&next=yes", true],
        ["https://example.com/search?q=*", "https://example.com/searchXq=test", false],
        ["https://example.com/search", "https://example.com/search?q=test", false],
        ["https://example.com/search?", "https://example.com/search?#fragment", true],
        ["https://example.com/search?", "https://example.com/search", false],
        ["https://example.com/search", "https://example.com/search?", false],
        ["https://example.com/Case", "https://example.com/case", false],
        ["https://example.com/a%2Fb", "https://example.com/a%2Fb", true],
        ["https://example.com/a%2Fb", "https://example.com/a/b", false],
        ["https://example.com/%C3%A9", "https://example.com/é", true],
    ] as const)("%s matches %s = %s", (pattern, url, expected) => {
        expect(createUrlMatcher([pattern], "tabs.query")(url)).toBe(expected);
    });

    test.each([
        "",
        "https://example.com",
        "https:///path",
        "https://*./*",
        "https://foo*bar/*",
        "https://example.*/*",
        "https://*.*.example.com/*",
        "https://user@example.com/*",
        "https://example.com:/*",
        "https://example.com:-1/*",
        "https://example.com:65536/*",
        "https://example.com:abc/*",
        "https://example.com:1:2/*",
        "http://[::1/*",
        "http://[]/*",
        "http://[not-ip]/*",
        "https://example.com/*#fragment",
        "https://example.com/a b",
        "https://example.com/\\*",
        "https://example%2Ecom/*",
        "http://*.[::1]/*",
    ])("rejects malformed input with API and pattern: %s", pattern => {
        expect(() => parseMatchPattern(pattern, "tabs.query")).toThrow("Invalid match pattern");
        expect(() => parseMatchPattern(pattern, "tabs.query")).toThrow("tabs.query");
        expect(() => parseMatchPattern(pattern, "tabs.query")).toThrow(JSON.stringify(pattern));
    });

    test.each([
        "ws://example.com/*",
        "wss://example.com/*",
        "ftp://example.com/*",
        "chrome://extensions/*",
        "HTTPS://example.com/*",
        "file://localhost/*",
        "*://localhost:3000/*",
        "http://*.127.0.0.1/*",
        "https://example.com/é",
        "https://localhost:0443/*",
    ])("rejects unsupported patterns explicitly: %s", pattern => {
        expect(() => parseMatchPattern(pattern, "tabs.query")).toThrow("Unsupported match pattern");
    });

    test("validates all OR alternatives and treats an empty list as matching nothing", () => {
        expect(() => createUrlMatcher(["<all_urls>", "bad"], "tabs.query")).toThrow("Invalid match pattern");
        expect(createUrlMatcher([], "tabs.query")("https://example.com/")).toBe(false);
    });
});

describe("host-permission pattern containment (not URL matching)", () => {
    test.each([
        ["<all_urls>", "*://*/*", true],
        ["<all_urls>", "file:///any/path", true],
        ["*://*/*", "<all_urls>", false],
        ["*://*.example.com/*", "https://shop.example.com/*", true],
        ["https://*.example.com/*", "*://shop.example.com/*", false],
        ["https://*.example.com/a", "https://example.com/b", true],
        ["https://*.example.com/*", "https://*.shop.example.com/*", true],
        ["https://*.shop.example.com/*", "https://*.example.com/*", false],
        ["https://example.com/*", "https://*.example.com/*", false],
        ["https://*.example.com/*", "https://*/*", false],
        ["https://*.example.com/*", "https://notexample.com/*", false],
        ["https://*.example.com/*", "https://example.com.evil.test/*", false],
        ["https://EXAMPLE.com./a", "https://example.com/b", true],
        ["https://example.com/*", "http://example.com/*", false],
        ["http://localhost/*", "http://localhost:3000/*", true],
        ["http://localhost:3000/*", "http://localhost/*", false],
        ["http://localhost:3000/*", "http://localhost:3000/*", true],
        ["http://localhost:3000/*", "http://localhost:3001/*", false],
        ["file:///one", "file:///two", true],
        ["file:///one", "https://example.com/*", false],
    ] as const)("%s covers %s = %s", (granted, requested, expected) => {
        expect(coversOrigin(parseMatchPattern(granted, "test"), parseMatchPattern(requested, "test"))).toBe(expected);
    });
});
