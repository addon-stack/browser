import bookmarks from "./bookmarks";
import dnr from "./declarative-net-request";
import identity from "./identity";
import search from "./search";
import sidebar, {sidePanel} from "./sidebar";
import tabGroups from "./tab-groups";
import topSites from "./top-sites";

import type {BrowserSuite} from "../types";

const suites: BrowserSuite[] = [bookmarks, dnr, identity, search, sidebar, sidePanel, tabGroups, topSites];
export default suites;
