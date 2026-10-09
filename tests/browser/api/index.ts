import bookmarks from "./bookmarks";
import dnr from "./declarative-net-request";
import search from "./search";
import topSites from "./top-sites";

import type {BrowserSuite} from "../types";

const suites: BrowserSuite[] = [bookmarks, dnr, search, topSites];
export default suites;
