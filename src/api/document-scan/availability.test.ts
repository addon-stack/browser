import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableDocumentScan} from "./availability";

describeNamespaceAvailability("documentScan", isAvailableDocumentScan);
