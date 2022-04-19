import { CollectionRepresentation, LinkedRepresentation, RelationshipType } from 'semantic-link';

export interface ResourceCreateOptions {

    /**
     * The resource context in which the new resource is created at the origin server.
     *
     * In a hypermedia level 3 implementation the context will be used for:
     *   - locating the edit-form (which describes how to create the resource)
     *   - where to store the local representation of the resource
     *
     * Logically this is a mandatory option, as all resources must be created in the context
     * of another resource.
     *
     * For a level 2 hypermedia client, resources may be created in the context of a simple
     * {@link LinkedRepresentation}.
     */
    readonly createContext?: CollectionRepresentation | LinkedRepresentation;

    /**
     * The link relation on the resource used to determine the resource.
     *
     * @alias: {@link ResourceQueryOptions.rel}
     * @default: {@link LinkRelation.Self}
     */
    readonly rel?: RelationshipType;
}

