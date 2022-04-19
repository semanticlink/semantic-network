import { CollectionRepresentation, RelationshipType } from 'semantic-link';

export interface ResourceCreateOptions {

    /**
     * When collection is provided, the resource will be created as an item on the collection
     */
    readonly onCollection?: CollectionRepresentation;

    /**
     * The link relation on the resource used to determine the resource.
     *
     * @alias: {@link ResourceQueryOptions.rel}
     * @default: {@link LinkRelation.Self}
     */
    readonly rel?: RelationshipType;
}

