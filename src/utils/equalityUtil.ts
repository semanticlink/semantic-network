import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { CanonicalOrSelf } from './comparators/canonicalOrSelf';
import { TrackedRepresentationUtil } from './trackedRepresentationUtil';
import { instanceOfTrackedRepresentation } from './instanceOf/instanceOfTrackedRepresentation';
import { EqualityMatcher } from '../interfaces/collectionMergerOptions';

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

    /**
     * Checks if the identity and the version both match
     */
    public static matchesIdAndETag(lvalue: LinkedRepresentation, rvalue: LinkedRepresentation, relationshipType: RelationshipType): boolean {
        if (EqualityUtil.matches(lvalue, rvalue, relationshipType)) {
            return EqualityUtil.matchesETag(lvalue, rvalue);
        }
        return false;
    }

    /**
     * Checks if there is no difference in eTags (both empty also equals same)
     */
    public static matchesETag(lvalue: LinkedRepresentation, rvalue: LinkedRepresentation): boolean {
        const lEtag = instanceOfTrackedRepresentation(lvalue) && TrackedRepresentationUtil.getETag(lvalue) || '';
        const rEtag = instanceOfTrackedRepresentation(rvalue) && TrackedRepresentationUtil.getETag(rvalue) || '';
        return lEtag === rEtag;
    }
}

export const defaultEqualityMatcher: EqualityMatcher = EqualityUtil.matches;
