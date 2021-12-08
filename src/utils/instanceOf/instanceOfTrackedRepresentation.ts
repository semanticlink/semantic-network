import { instanceOfLinkedRepresentation, LinkedRepresentation } from 'semantic-link';
import { state, Tracked } from '../../types/types';

/**
 * A guard to detect whether the object has {@link State} and is a {@link LinkedRepresentation}
 *
 * @param object
 * @returns whether the object is an instance on the interface
 */
export function instanceOfTrackedRepresentation<T extends LinkedRepresentation>(object: unknown | LinkedRepresentation): object is Tracked<T> {
    return instanceOfLinkedRepresentation(object) && (object as Tracked<T>)[state] !== undefined;
}
