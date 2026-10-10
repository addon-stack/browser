import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableTabGroups} from "./availability";

describeNamespaceAvailability("tabGroups", isAvailableTabGroups);
