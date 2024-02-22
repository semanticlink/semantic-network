import { Comparator } from '../../interfaces/comparator';
import { ComparableRepresentation } from '../../interfaces/comparableRepresentation';

/**
 * Simple match on the 'id' attribute on the resources
 */
export const id: Comparator<ComparableRepresentation> = (lvalue: ComparableRepresentation, rvalue: ComparableRepresentation): boolean => {
    if (lvalue.id && rvalue.id) {
        return lvalue.id === rvalue.id;
    }
    return false;
};
