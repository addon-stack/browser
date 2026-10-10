import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableWindows} from "./availability";

describeNamespaceAvailability("windows", isAvailableWindows);
