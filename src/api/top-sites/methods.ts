import {browser} from "../browser";
import {callWithPromise} from "../utils";

import type {TopSite, TopSitesOptions} from "./types";

/** Options are supported by Firefox only; unsupported calls retain native errors. */
export const getTopSites = (options?: TopSitesOptions): Promise<TopSite[]> =>
    callWithPromise(cb => options === undefined ? browser().topSites.get(cb) : browser().topSites.get(options));
