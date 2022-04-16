import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { LinkRelation } from '../../linkRelation';

export const CanonicalOrSelf: RelationshipType = [LinkRelation.Canonical, LinkRelation.Self];

/**
 * Match on the Canonical or Self link relation on the resources
 */
export function canonicalOrSelf(lvalue: LinkedRepresentation, rvalue: LinkedRepresentation): boolean {
    const lUri = LinkUtil.getUri(lvalue, CanonicalOrSelf);
    const rUri = LinkUtil.getUri(rvalue, CanonicalOrSelf);
    if (lUri && rUri) {
        return lUri === rUri;
    }
    return false;
}
