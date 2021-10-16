

/**
 * A guard to detect whether the object is a {@link UriList}
 *
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfUriList(object: unknown): object is UriList {
    // a very naive type check for a UriList
    if (Array.isArray(object)) {
        return typeof object[0] === 'string';
    } else {
        return false;
    }
    // return Array.isArray(object) && typeof first === 'string';
}
