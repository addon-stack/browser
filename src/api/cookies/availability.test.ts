import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableCookies} from "./availability";

describeNamespaceAvailability("cookies", isAvailableCookies);
