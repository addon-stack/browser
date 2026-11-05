#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
@interface AuditWindow : NSObject <WKWebExtensionWindow>
@property NSArray *tabs;
@end
@interface AuditTab : NSObject <WKWebExtensionTab>
@property AuditWindow *window;
@end
@implementation AuditWindow
- (NSArray *)tabsForWebExtensionContext:(WKWebExtensionContext *)c { return self.tabs; }
- (id)activeTabForWebExtensionContext:(WKWebExtensionContext *)c { return self.tabs.firstObject; }
@end
@implementation AuditTab
- (id)windowForWebExtensionContext:(WKWebExtensionContext *)c { return self.window; }
- (NSUInteger)indexInWindowForWebExtensionContext:(WKWebExtensionContext *)c { return 0; }
- (NSString *)titleForWebExtensionContext:(WKWebExtensionContext *)c { return @"Isolated host tab"; }
- (NSURL *)urlForWebExtensionContext:(WKWebExtensionContext *)c { return [NSURL URLWithString:@"about:blank"]; }
- (BOOL)isSelectedForWebExtensionContext:(WKWebExtensionContext *)c { return YES; }
- (BOOL)isLoadingCompleteForWebExtensionContext:(WKWebExtensionContext *)c { return YES; }
@end
@interface Receiver : NSObject <WKScriptMessageHandler, WKNavigationDelegate, WKWebExtensionControllerDelegate>
@property WKWebView *webView;
@property AuditWindow *window;
@property WKWebExtensionController *controller;
@property WKWebExtensionContext *context;
@end
@implementation Receiver
- (NSArray *)webExtensionController:(WKWebExtensionController *)c openWindowsForExtensionContext:(WKWebExtensionContext *)e { return @[self.window]; }
- (id)webExtensionController:(WKWebExtensionController *)c focusedWindowForExtensionContext:(WKWebExtensionContext *)e { return self.window; }
- (void)userContentController:(WKUserContentController *)c didReceiveScriptMessage:(WKScriptMessage *)m {
    NSData *data = [NSJSONSerialization dataWithJSONObject:m.body options:NSJSONWritingPrettyPrinted error:nil];
    puts([[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding].UTF8String);
    exit(0);
}
- (void)webView:(WKWebView *)v didFailProvisionalNavigation:(WKNavigation *)n withError:(NSError *)e { NSLog(@"navigation: %@", e); exit(2); }
@end
int main(int argc, const char *argv[]) { @autoreleasepool {
    if (argc != 2) { fputs("Expected an extension directory\n", stderr); return 2; }
    [NSApplication sharedApplication];
    [NSApp setActivationPolicy:NSApplicationActivationPolicyProhibited];
    Receiver *receiver = [Receiver new];
    receiver.window = [AuditWindow new];
    AuditTab *tab = [AuditTab new]; tab.window = receiver.window; receiver.window.tabs = @[tab];
    NSURL *root = [NSURL fileURLWithPath:[NSString stringWithUTF8String:argv[1]] isDirectory:YES];
    [WKWebExtension extensionWithResourceBaseURL:root completionHandler:^(WKWebExtension *extension, NSError *error) {
        if (error) { NSLog(@"extension: %@", error); exit(2); }
        WKWebExtensionControllerConfiguration *controllerConfig = WKWebExtensionControllerConfiguration.nonPersistentConfiguration;
        WKWebViewConfiguration *webViewConfig = [WKWebViewConfiguration new];
        webViewConfig.websiteDataStore = WKWebsiteDataStore.nonPersistentDataStore;
        controllerConfig.webViewConfiguration = webViewConfig;
        receiver.controller = [[WKWebExtensionController alloc] initWithConfiguration:controllerConfig];
        receiver.controller.delegate = receiver;
        receiver.context = [[WKWebExtensionContext alloc] initForExtension:extension];
        receiver.context.baseURL = [NSURL URLWithString:@"webkit-extension://audit/"];
        for (NSString *permission in extension.requestedPermissions) [receiver.context setPermissionStatus:WKWebExtensionContextPermissionStatusGrantedExplicitly forPermission:permission];
        for (WKWebExtensionMatchPattern *pattern in extension.requestedPermissionMatchPatterns) [receiver.context setPermissionStatus:WKWebExtensionContextPermissionStatusGrantedExplicitly forMatchPattern:pattern];
        NSError *loadError = nil;
        if (![receiver.controller loadExtensionContext:receiver.context error:&loadError]) { NSLog(@"load: %@", loadError); exit(2); }
        WKWebViewConfiguration *config = receiver.context.webViewConfiguration;
        [config.userContentController addScriptMessageHandler:receiver name:@"result"];
        receiver.webView = [[WKWebView alloc] initWithFrame:NSMakeRect(0, 0, 800, 600) configuration:config];
        receiver.webView.navigationDelegate = receiver;
        [receiver.webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"probe.html" relativeToURL:receiver.context.baseURL]]];
    }];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 45 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{ NSLog(@"timeout"); exit(3); });
    [NSApp run];
} }
