import { Comparator } from '../../interfaces/comparator';
import { ComparableRepresentation } from '../../interfaces/comparableRepresentation';

/**
 * Simple match on the name attribute on the resources
 */
export const emptyName: Comparator<ComparableRepresentation> = (lvalue: ComparableRepresentation, rvalue: ComparableRepresentation): boolean => !lvalue.name && !rvalue.name;
