import { Comparator } from '../../interfaces/comparator';
import { ComparableRepresentation } from '../../interfaces/comparableRepresentation';

/**
 * Simple match on the name attribute on the resources
 */
export const name: Comparator<ComparableRepresentation> = (lvalue: ComparableRepresentation, rvalue: ComparableRepresentation): boolean => {
    if (lvalue.name && rvalue.name) {
        return lvalue.name === rvalue.name;
    }
    return false;
};
