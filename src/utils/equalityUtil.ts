import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { CanonicalOrSelf } from './comparators/canonicalOrSelf';

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
