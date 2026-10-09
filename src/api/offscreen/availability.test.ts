import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableOffscreen} from "./availability";

describeNamespaceAvailability("offscreen", isAvailableOffscreen);
