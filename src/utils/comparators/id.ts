import { ComparableRepresentation } from '../../interfaces/comparator';

/**
 * Simple match on the 'id' attribute on the resources
 */
export function id(lvalue: ComparableRepresentation, rvalue: ComparableRepresentation): boolean {
    if (lvalue.id && rvalue.id) {
        return lvalue.id === rvalue.id;
    }
    return false;
}
