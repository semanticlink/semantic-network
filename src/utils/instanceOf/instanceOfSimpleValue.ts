export function instanceOfSimpleValue(obj: unknown): obj is string | number {
    return typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'undefined';
}
