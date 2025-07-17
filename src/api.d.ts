declare namespace browser {
    /**
     * @see: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction
     */
    namespace sidebarAction {
        /**
         * Pixel data for an image (for example, from a <canvas> element).
         */
        type ImageDataType = ImageData;

        /**
         * Closes the sidebar.
         * @returns A promise that is resolved once the sidebar is closed.
         */
        function close(): Promise<void>;

        /**
         * Opens the sidebar in the active window. Must be called during a user gesture.
         * @returns A promise that is resolved once the sidebar is opened.
         */
        function open(): Promise<void>;

        /**
         * Toggles the visibility of the sidebar.
         * @returns A promise that is resolved once the action completes.
         */
        function toggle(): Promise<void>;

        /**
         * Checks whether the sidebar is open in the given window.
         * @param details Optional object with `windowId`; defaults to the topmost window.
         * @returns A promise fulfilled with `true` if the sidebar is open, otherwise `false`.
         */
        function isOpen(details: { windowId?: number }): Promise<boolean>;

        /**
         * Gets the URL of the HTML document defining the sidebar’s contents.
         * @param details Optional object with `tabId` and/or `windowId`; omitting both returns the global panel URL.
         * @returns A promise fulfilled with the fully qualified URL for the panel.
         */
        function getPanel(details: { tabId?: number; windowId?: number }): Promise<string>;

        /**
         * Sets which HTML document to display in the sidebar.
         * @param details Object with:
         *   - `panel`: URL string or `null` to reset,
         *   - optional `tabId` or `windowId` to scope the change.
         * @returns A promise that is resolved once the panel is set.
         */
        function setPanel(details: { panel: string | null; tabId?: number; windowId?: number }): Promise<void>;

        /**
         * Gets the sidebar’s title.
         * @param details Optional object with `tabId` and/or `windowId`; omitting both returns the global title.
         * @returns A promise fulfilled with the current title string.
         */
        function getTitle(details: { tabId?: number; windowId?: number }): Promise<string>;

        /**
         * Sets the sidebar’s title.
         * @param details Object with:
         *   - `title`: new string or `null` to reset,
         *   - optional `tabId` or `windowId` to scope the change.
         * @returns A promise that is resolved once the title is set.
         */
        function setTitle(details: { title: string | null; tabId?: number; windowId?: number }): Promise<void>;

        /**
         * Sets the sidebar’s action icon.
         * @param details Object with one of:
         *   - `path`: string or size→path map,
         *   - `imageData`: ImageData or size→ImageData map,
         *   plus optional `tabId` or `windowId`.
         * @returns A promise that is resolved once the icon is set.
         */
        function setIcon(details: {
            path?: string | Record<number, string>;
            imageData?: ImageDataType | Record<number, ImageDataType>;
            tabId?: number;
            windowId?: number;
        }): Promise<void>;
    }

    namespace runtime {
        interface BrowserInfo {
            /** string value representing the browser name, for example "Firefox". */
            name: string;
            /** string value representing the browser's vendor, for example "Mozilla". */
            vendor: string;
            /** string representing the browser's version, for example "51.0" or "51.0a2". */
            version: string;
            /** string representing the specific build of the browser, for example "20161018004015". */
            buildID: string;
        }

        /**
         * Returns information about the current browser.
         * @returns Promise, resolved with an object containing browser info.
         */
        function getBrowserInfo(): Promise<BrowserInfo>;
    }

}

declare namespace opr {
    namespace sidebarAction {
        /**
         * RGBA color tuple representing red, green, blue, and alpha values.
         * Each value is a number from 0 to 255.
         */
        type RGBA = [number, number, number, number];

        /**
         * Details object for identifying a specific tab.
         */
        interface TabDetails {
            /** Optional tab ID. If omitted, applies to the active tab. */
            tabId?: number;
        }

        /**
         * Details object for setting the sidebar title.
         */
        interface TitleDetails extends TabDetails {
            /** The new title text for the sidebar. */
            title: string;
        }

        /**
         * Details object for setting the sidebar icon.
         */
        interface IconDetails extends TabDetails {
            /** Path to an icon file or map of icon sizes to paths. */
            path?: string | Record<string, string>;
            /** Alternatively, raw ImageData for the icon. */
            imageData?: ImageData;
        }

        /**
         * Details object for setting the sidebar panel URL.
         */
        interface PanelDetails extends TabDetails {
            /** URL of the HTML document to display in the sidebar panel. */
            panel: string;
        }

        /**
         * Details object for setting badge text.
         */
        interface BadgeTextDetails extends TabDetails {
            /** Text to display on the sidebar badge. */
            text: string;
        }

        /**
         * Details object for setting color properties.
         */
        interface ColorDetails extends TabDetails {
            /** RGBA color value. */
            color: string | RGBA;
        }

        /**
         * Gets the sidebar's title for the specified tab.
         * @param details Tab details object; omitting tabId gets the global title.
         * @param callback Function called with the current title string.
         */
        function getTitle(details: TabDetails, callback: (title: string) => void): void;
        function getTitle(details: TabDetails): Promise<string>;

        /**
         * Sets the sidebar's title for the specified tab.
         * @param details Object containing the new title and optional tab ID.
         */
        function setTitle(details: TitleDetails): void;

        /**
         * Sets the sidebar's icon for the specified tab.
         * @param details Object containing icon data (path or imageData) and optional tab ID.
         */
        function setIcon(details: IconDetails): void;

        /**
         * Gets the URL of the HTML document displayed in the sidebar panel.
         * @param details Tab details object; omitting tabId gets the global panel URL.
         * @param callback Function called with the current panel URL string.
         */
        function getPanel(details: TabDetails, callback: (panel: string) => void): void;
        function getPanel(details: TabDetails): Promise<string>;

        /**
         * Sets which HTML document to display in the sidebar panel.
         * @param details Object containing the panel URL and optional tab ID.
         */
        function setPanel(details: PanelDetails): void;

        /**
         * Gets the current badge text for the sidebar.
         * @param details Tab details object; omitting tabId gets the global badge text.
         * @param callback Function called with the current badge text string.
         */
        function getBadgeText(details: TabDetails, callback: (text: string) => void): void;

        /**
         * Sets the badge text displayed on the sidebar icon.
         * @param details Object containing the badge text and optional tab ID.
         */
        function setBadgeText(details: BadgeTextDetails): void;

        /**
         * Gets the background color of the sidebar badge.
         * @param details Tab details object; omitting tabId gets the global badge background color.
         * @param callback Function called with the current background color as RGBA tuple.
         */
        function getBadgeBackgroundColor(details: TabDetails, callback: (color: RGBA) => void): void;

        /**
         * Sets the background color of the sidebar badge.
         * @param details Object containing the RGBA color and optional tab ID.
         */
        function setBadgeBackgroundColor(details: ColorDetails): void;

        /**
         * Gets the text color of the sidebar badge.
         * @param details Tab details object; omitting tabId gets the global badge text color.
         * @param callback Function called with the current text color as RGBA tuple.
         */
        function getBadgeTextColor(details: TabDetails, callback: (color: RGBA) => void): void;

        /**
         * Sets the text color of the sidebar badge.
         * @param details Object containing the RGBA color and optional tab ID.
         */
        function setBadgeTextColor(details: ColorDetails): void;

        /**
         * Gets the background color used when the sidebar is selected.
         * @param details Tab details object; omitting tabId gets the global selected background color.
         * @param callback Function called with the current selected background color as RGBA tuple.
         */
        function getSelectedBackgroundColor(details: TabDetails, callback: (color: RGBA) => void): void;

        /**
         * Sets the background color used when the sidebar is selected.
         * @param details Object containing the RGBA color and optional tab ID.
         */
        function setSelectedBackgroundColor(details: ColorDetails): void;

        /**
         * Event interface for sidebar focus/blur events.
         */
        interface SidebarEvent {
            /**
             * Adds a listener for the sidebar event.
             * @param callback Function to call when the event fires.
             */
            addListener(callback: (win: Window) => void): void;

            /**
             * Removes a previously added event listener.
             * @param callback The listener function to remove.
             */
            removeListener(callback: (win: Window) => void): void;

            /**
             * Checks if a listener is already registered for this event.
             * @param callback The listener function to check.
             * @returns True if the listener is registered, false otherwise.
             */
            hasListener(callback: (win: Window) => boolean): boolean;
        }

        /**
         * Fired when the sidebar gains focus.
         */
        const onFocus: SidebarEvent;

        /**
         * Fired when the sidebar loses focus.
         */
        const onBlur: SidebarEvent;
    }
}

declare namespace chrome {
    namespace tabs {
        /**
         * Removes CSS that was previously injected by insertCSS.
         * @param tabId The ID of the tab from which to remove CSS.
         * @param details Details about the CSS to remove.
         * @param callback Optional callback function.
         */
        function removeCSS(tabId: number, details: chrome.extensionTypes.InjectDetails, callback?: () => void): void;

        /**
         * Removes CSS that was previously injected by insertCSS (Promise version).
         * @param tabId The ID of the tab from which to remove CSS.
         * @param details Details about the CSS to remove.
         * @returns A Promise that resolves when the CSS is removed.
         */
        function removeCSS(tabId: number, details: chrome.extensionTypes.InjectDetails): Promise<void>;
    }
}
