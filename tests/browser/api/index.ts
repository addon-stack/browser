import bookmarks from "./bookmarks";
import dnr from "./declarative-net-request";
import search from "./search";
import tabGroups from "./tab-groups";
import topSites from "./top-sites";

import type {BrowserSuite} from "../types";

const suites: BrowserSuite[] = [bookmarks, dnr, search, tabGroups, topSites];
export default suites;
