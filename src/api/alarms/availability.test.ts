import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableAlarms} from "./availability";

describeNamespaceAvailability("alarms", isAvailableAlarms);
