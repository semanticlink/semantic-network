import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { LinkRelation } from '../../linkRelation';

export const CanonicalOrSelf: RelationshipType = [LinkRelation.Canonical, LinkRelation.Self];

export class EqualityUtil {
    /**
     * Checks if two resource identities are the same.
     *
     * @default {@link CanonicalOrSelf}
     */
    public static matches(lvalue: LinkedRepresentation, rvalue: LinkedRepresentation, relationshipType: RelationshipType = CanonicalOrSelf): boolean {

        const lUri = LinkUtil.getUri(lvalue, relationshipType);
        const rUri = LinkUtil.getUri(rvalue, relationshipType);
        if (lUri && rUri) {
            return lUri === rUri;
        }
        return false;
    }
}

/**
 * Matches on the Canonical or Self link relation on the resources
 */
export function canonicalOrSelf(lvalue: LinkedRepresentation, rvalue: LinkedRepresentation): boolean {
    return EqualityUtil.matches(lvalue, rvalue, CanonicalOrSelf);
}
