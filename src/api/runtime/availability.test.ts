import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableRuntime} from "./availability";

describeNamespaceAvailability("runtime", isAvailableRuntime);
