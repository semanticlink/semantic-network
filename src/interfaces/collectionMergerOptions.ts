import { LinkedRepresentation, RelationshipType } from 'semantic-link';

export type EqualityMatcher = (lvalue: LinkedRepresentation, rvalue: LinkedRepresentation, relationshipType: RelationshipType) => boolean;

/**
 * Options available when using the {@link CollectionMerger} merging between two collections
 */
export interface CollectionMergerOptions {

    /**
     * When comparing two items in a collection, compare their equality
     *
     * @default {@link canonicalOrSelf}
     */
    readonly equalityOperator?: RelationshipType;

    /**
     * Function to compare two items for equality
     *
     * @default {@link canonicalOrSelf}
     */
    readonly equalityMatcher?: EqualityMatcher;

    /**
     * When set to true headers are set from the incoming collection
     *
     * @default true
     */
    readonly mergeHeaders?: boolean;

    /**
     * When merging two collections, also merge the links as well as the items
     *
     * @default true
     */
    readonly mergeLinks?: boolean;
}
