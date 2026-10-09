import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableHistory} from "./availability";

describeNamespaceAvailability("history", isAvailableHistory);
