export type FirefoxRuntime = typeof browser.runtime;
export type FirefoxSidebarAction = typeof browser.sidebarAction;
export type OperaSidebarAction = typeof opr.sidebarAction;

export type SidebarAction = FirefoxSidebarAction | OperaSidebarAction;
