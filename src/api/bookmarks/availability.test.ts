import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableBookmarks} from "./availability";

describeNamespaceAvailability("bookmarks", isAvailableBookmarks);
