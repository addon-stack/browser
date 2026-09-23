export const unsupportedApiError = (name: string): Error => new Error(`Browser test API "${name}" is not configured`);
