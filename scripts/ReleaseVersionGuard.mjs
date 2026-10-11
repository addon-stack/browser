import {Plugin} from "release-it";

export default class ReleaseVersionGuard extends Plugin {
    init() {
        const {increment} = this.config.getContext("version");

        if (this.options.currentVersion.startsWith("0.") && ["major", "premajor"].includes(increment)) {
            throw new Error("The first stable release must be requested explicitly as 1.0.1, not major or premajor.");
        }

        this.validateVersion(increment);
    }

    beforeBump() {
        this.validateVersion(this.config.getContext("version"));
    }

    validateVersion(version) {
        if (typeof version === "string" && /^v?1\.0\.0(?:$|[-+])/.test(version)) {
            throw new Error("1.0.0 was published accidentally and cannot be reused. Use 1.0.1 for the first stable release.");
        }

        if (this.options.currentVersion.startsWith("0.") && /^v?[1-9]\d*\./.test(version) && !/^v?1\.0\.1(?:$|[-+])/.test(version)) {
            throw new Error("The first stable release from 0.x must be 1.0.1 (or a 1.0.1 release candidate).");
        }
    }
}
