import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableWebNavigation} from "./availability";

describeNamespaceAvailability("webNavigation", isAvailableWebNavigation);
