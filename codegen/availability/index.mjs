import apis from "./apis.mjs";
import {generateAvailability} from "./generate.mjs";

export default function generate() {
    return generateAvailability(apis);
}
