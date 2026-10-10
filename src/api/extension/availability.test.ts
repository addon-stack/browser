import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableExtension} from "./availability";

describeNamespaceAvailability("extension", isAvailableExtension);
