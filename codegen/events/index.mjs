import apis from "./apis/index.mjs";
import {generateEvents} from "./generate.mjs";

export default function generate() {
    return generateEvents(apis);
}
