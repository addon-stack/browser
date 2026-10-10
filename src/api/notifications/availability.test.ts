import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableNotifications} from "./availability";

describeNamespaceAvailability("notifications", isAvailableNotifications);
