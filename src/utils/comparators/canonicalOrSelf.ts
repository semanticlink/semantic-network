import { LinkedRepresentation, RelationshipType } from 'semantic-link';
import { LinkRelation } from '../../linkRelation';
import { EqualityUtil } from '../equalityUtil';
import { Comparator } from '../../interfaces/comparator';
import { ComparableRepresentation } from '../../interfaces/comparableRepresentation';

export const CanonicalOrSelf: RelationshipType = [LinkRelation.Canonical, LinkRelation.Self];

/**
 * Matches on the Canonical or Self link relation on the resources
 */
export const canonicalOrSelf: Comparator<ComparableRepresentation> = (lvalue: LinkedRepresentation, rvalue: LinkedRepresentation): boolean => EqualityUtil.matches(lvalue, rvalue, CanonicalOrSelf);
