import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableIdle} from "./availability";

describeNamespaceAvailability("idle", isAvailableIdle);
