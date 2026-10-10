import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableTopSites} from "./availability";

describeNamespaceAvailability("topSites", isAvailableTopSites);
