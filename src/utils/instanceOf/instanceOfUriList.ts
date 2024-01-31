import { UriList } from '../../types/mediaTypes';
import { Uri } from 'semantic-link';

/**
 * A guard to detect whether the object is a {@link UriList}
 *
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfUriList(object: unknown): object is UriList {
    if (Array.isArray(object)) {
        return object.every(instanceOfUri);
    } else {
        return false;
    }
}

/**
 * A guard to detect whether the object is a {@link Uri}
 *
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfUri(object: unknown): object is Uri {
    if (typeof object === 'string') {
        try {
            new URL(object);
            return true;
        } catch (error) {
            return false;
        }
    } else {
        return false;
    }
}
