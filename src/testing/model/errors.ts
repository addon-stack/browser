export const missingEntityError = (kind: "tab" | "window", id: number): Error =>
    new Error(`No ${kind} with id: ${id}.`);
