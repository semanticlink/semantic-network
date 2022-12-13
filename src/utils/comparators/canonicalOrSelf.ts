import { LinkedRepresentation, RelationshipType } from 'semantic-link';
import { LinkRelation } from '../../linkRelation';
import { EqualityUtil } from '../equalityUtil';

export const CanonicalOrSelf: RelationshipType = [LinkRelation.Canonical, LinkRelation.Self];

/**
 * Matches on the Canonical or Self link relation on the resources
 */
export function canonicalOrSelf(lvalue: LinkedRepresentation, rvalue: LinkedRepresentation): boolean {
    return EqualityUtil.matches(lvalue, rvalue, CanonicalOrSelf);
}
