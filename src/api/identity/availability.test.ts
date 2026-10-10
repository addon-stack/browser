import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableIdentity} from "./availability";

describeNamespaceAvailability("identity", isAvailableIdentity);
