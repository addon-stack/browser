import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableWebRequest} from "./availability";

describeNamespaceAvailability("webRequest", isAvailableWebRequest);
