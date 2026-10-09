import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableCommands} from "./availability";

describeNamespaceAvailability("commands", isAvailableCommands);
