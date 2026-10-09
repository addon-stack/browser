import {describeNamespaceAvailability} from "../../../tests/api/availability";
import {isAvailableAudio} from "./availability";

describeNamespaceAvailability("audio", isAvailableAudio);
