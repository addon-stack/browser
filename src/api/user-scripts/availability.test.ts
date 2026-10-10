import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableUserScripts} from "./availability";

describeNamespaceAvailability("userScripts", isAvailableUserScripts);
