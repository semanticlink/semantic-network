import { RelationshipType } from 'semantic-link';

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
     * When merging two collections, also merge the links as well as the items
     *
     * @default true
     */
    readonly mergeLinks?: boolean;
}
