import bookmarks from "./bookmarks";
import search from "./search";
import topSites from "./top-sites";

import type {BrowserSuite} from "../types";

const suites: BrowserSuite[] = [bookmarks, search, topSites];
export default suites;
