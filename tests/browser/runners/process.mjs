import {spawn} from "node:child_process";

// Own a process group so startup failures and timeouts also close browser children.
export function launchProcess(binary, args) {
    const child = spawn(binary, args, {detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"]});
    let diagnostics = "";

    for (const stream of [child.stdout, child.stderr]) {
        stream.on("data", chunk => {
            diagnostics = (diagnostics + chunk).slice(-8000);
        });
    }

    const closed = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("exit", (code, signal) => resolve({code, signal}));
    });

    void closed.catch(() => undefined);

    const kill = signal => {
        if (!child.pid) {
            return;
        }

        try {
            process.kill(process.platform === "win32" ? child.pid : -child.pid, signal);
        } catch (error) {
            if (error.code !== "ESRCH") {
                throw error;
            }
        }
    };

    return {
        closed,
        get diagnostics() {
            return diagnostics;
        },
        async stop() {
            let timer;

            try {
                if (child.exitCode !== null || child.signalCode !== null) {
                    await closed;

                    return;
                }

                if (process.platform === "win32" && child.pid) {
                    await new Promise((resolve, reject) => {
                        const taskkill = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {stdio: "ignore"});
                        taskkill.once("error", reject);

                        taskkill.once("exit", code => {
                            if (code !== 0 && child.exitCode === null && child.signalCode === null) {
                                reject(new Error(`Could not terminate browser process tree (taskkill ${code})`));
                            } else {
                                resolve();
                            }
                        });
                    });
                } else {
                    kill("SIGTERM");
                }

                await Promise.race([closed, new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        try {
                            kill("SIGKILL");
                        } catch (error) {
                            reject(error);
                        }
                    }, 3000);
                })]);
            } finally {
                clearTimeout(timer);
                child.stdout.destroy();
                child.stderr.destroy();
            }
        },
    };
}
