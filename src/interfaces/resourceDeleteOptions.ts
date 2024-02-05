import { LinkedRepresentation, LinkSelector, RelationshipType, Uri } from 'semantic-link';

export interface ResourceDeleteOptions {

    /**
     * Removes a deleted item from the collection rather than just marking the {@link State.status} as {@link Status.deleted}
     * @default true
     */
    readonly removeOnDeleteItem?: boolean;

    /**
     * Identifies the item resource in a collection by its identity (either as 'Self' link rel or a `Uri`) to delete
     * @alias: {@link ResourceQueryOptions.where}
     */
    readonly where?: LinkedRepresentation | Uri | (<T extends LinkedRepresentation>() => T) | LinkSelector;

    /**
     * The link relation on the resource used to determine the resource.
     *
     * @default: {@link LinkRelation.Self}
     * @alias: {@link ResourceQueryOptions.rel}
     */
    readonly rel?: RelationshipType;

    /**
     * After performing a logical delete, the resource is marked as stale before a reload. This is used which an item
     * in a collection has archive lifecycles and can be returned via search-type collections.
     *
     * Currently only implemented on singleton resources (rather than items in collections)
     * @default false
     */
    readonly reloadOnDelete?: boolean;

}
