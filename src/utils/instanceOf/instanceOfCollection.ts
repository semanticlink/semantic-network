import { CollectionRepresentation, instanceOfLinkedRepresentation, LinkedRepresentation } from 'semantic-link';
import { instanceOfForm } from './instanceOfForm';

/**
 * A guard to detect whether the object is a {@link CollectionRepresentation<T extends LinkedRepresentation>}.
 * A linked representation must be an object with an array called 'links'.
 *
 * @see https://stackoverflow.com/questions/14425568/interface-type-check-with-typescript
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfCollection<T extends LinkedRepresentation>(object: unknown | CollectionRepresentation<T>): object is CollectionRepresentation<T> {

    if (instanceOfLinkedRepresentation(object)) {
        if ('items' in object) {
            const anObject = object as CollectionRepresentation;
            if (Array.isArray(anObject.items)) {
                return !instanceOfForm(object);
            }
        }
    }
    return false;

}
