import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableManagement} from "./availability";

describeNamespaceAvailability("management", isAvailableManagement);
