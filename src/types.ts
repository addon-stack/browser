export type FirefoxSidebarAction = typeof browser.sidebarAction;
export type OperaSidebarAction = typeof opr.sidebarAction;

export type SidebarAction = FirefoxSidebarAction | OperaSidebarAction;
