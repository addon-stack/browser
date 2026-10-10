import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableScripting} from "./availability";

describeNamespaceAvailability("scripting", isAvailableScripting);
