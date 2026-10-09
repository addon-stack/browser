import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableBrowsingData} from "./availability";

describeNamespaceAvailability("browsingData", isAvailableBrowsingData);
