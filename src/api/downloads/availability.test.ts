import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableDownloads} from "./availability";

describeNamespaceAvailability("downloads", isAvailableDownloads);
