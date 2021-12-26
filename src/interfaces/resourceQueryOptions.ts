import { LinkedRepresentation, LinkSelector, RelationshipType, Uri } from 'semantic-link';

export interface ResourceQueryOptions {
    /**
     * If this is set then the get will perform a `tryGet` and return default representation on failure
     */
    defaultValues?: Partial<LinkedRepresentation>;
    /**
     * Identifies the child resource in a collection by its identity (either as 'Self' link rel or a `Uri`)
     */
    where?: LinkedRepresentation | Uri | (<T extends LinkedRepresentation>() => T) | LinkSelector;
    /**
     * Identifies the link rel to follow to add {@link LinkedRepresentation} onto the resource.
     *
     * When combined with {@link where} the rel denotes a sub resource to follow first which should contain the collection
     * to query on.
     */
    rel?: RelationshipType;
   /**
     * Identifies the link rel to follow to hydrate {@link LinkedRepresentation}.
     */
    self?: RelationshipType;
    /**
     * The name of the attribute that the {@link LinkedRepresentation} is added on the resource. Note: this
     * value is defaulted based on the {@link rel} if not specified. If the {@link rel} is
     * an array then this value must be explicitly set.
     */
    name?: string;
    /**
     * The name of the attribute that the {@link LinkedRepresentation} is added on the resource. Note: this
     * value is defaulted based on the {@link rel} if not specified. If the {@link rel} is
     * an array then this value must be explicitly set.
     */
    nameStrategy?: (name: RelationshipType) => string | undefined | never;
    /**
     * Alters the hydration strategy for {@link CollectionRepresentation<T>}. By default collections are sparsely populated (that is
     * the {@link CollectionRepresentation<T>.items}  has not gone to the server to get all the details for each item).
     */
    includeItems?: boolean;

    /**
     * Alters the hydration strategy that it treats the resource as an array of resource and then does a further
     * get using the options as an iterator.
     *
     * This should not be used for eager loading of collections (ie items)—use `includeItems`
     */
    iterateOver?: boolean;

    /**
     * Used in conjunction with `iterateOver` for the strategy to load (arrays of) resources. The current implementation
     * supports only two practice cases: sequential ('1') or parallel ('0' or undefined).
     */
    batchSize?: number;
}
