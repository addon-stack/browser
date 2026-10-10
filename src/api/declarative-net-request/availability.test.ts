import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableDnr} from "./availability";

describeNamespaceAvailability("declarativeNetRequest", isAvailableDnr);
