/**
 * Creates a deep copy of the provided object, detached from any reactivity system.
 *
 * This function is commonly used to clone reactive data (e.g., from Vue 3's `reactive()` or `ref()`)
 * into a plain, non-reactive JavaScript object. It performs deep cloning using JSON serialization,
 * which also removes any prototype chains or non-serializable properties.
 *
 * Limitations:
 * - Will strip functions, `undefined`, `Symbol`, `Date`, `Map`, `Set`, and other non-JSON-compatible types.
 * - Will throw if the object contains circular references.
 * - If serialization fails, returns an empty object cast to type `T`.
 *
 * @template T - The type of the object being cloned.
 * @param {T} obj - The input object to be deep-cloned and detached.
 * @returns {T} A plain, deep-cloned object with no reactivity or prototype bindings.
 */
export function cloneDetached<T>(obj: T): T {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return {} as T;
    }
}
