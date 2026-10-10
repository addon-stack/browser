import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailablePermissions} from "./availability";

describeNamespaceAvailability("permissions", isAvailablePermissions);
