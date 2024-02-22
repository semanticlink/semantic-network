import { Comparator } from '../../interfaces/comparator';
import { canonicalOrSelf } from './canonicalOrSelf';
import { name } from './name';
import { ComparableRepresentation } from '../../interfaces/comparableRepresentation';

/**
 * A default set of comparisons made to check if two resource
 * representation refer to the same resource in a collection.
 *
 * The most specific and robust equality check is first, with the most vague and
 * optimistic last.
 *
 */
export const defaultEqualityOperators: Comparator<ComparableRepresentation>[] = [canonicalOrSelf, name];
