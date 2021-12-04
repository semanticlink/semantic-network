import { Representation } from '../../types/types';
import { CollectionRepresentation, LinkedRepresentation, RelationshipType } from 'semantic-link';
import { SyncComparator } from './syncComparator';
import { UriListResolver } from './uriListResolver';
import { SyncResolverOptions } from './syncResolverOptions';
import { Resolver } from '../resolver';
import { ResourceQueryOptions } from '../resourceQueryOptions';
import { FieldResolver } from '../fieldResolver';

export type PooledResolver = <T extends LinkedRepresentation>(resource: T, document: T, options?: SyncOptions) => Promise<void>;

export interface SyncOptions extends Partial<SyncResolverOptions> {
    /**
     * Set the size of the batches of requests on `sync`.
     *
     * When `sync` is moving through its child strategies the requests can be either sequential or parallel. Currently,
     * a non-zero number sets the strategy as sequential. The default value is 'undefined' or 0 to invoke a parallel
     * strategy.
     *
     * @see batchSize for controlling batching requests on individual resources
     */
    readonly strategyBatchSize?: number;

    /**
     * Set the size of the batches of requests on differencing for the creation and deletion of individual resources.
     *
     * When moving through differencing the requests can be either sequential or parallel. Currently,
     * a non-zero number sets the strategy as sequential. The default value is 'undefined' or 0 to invoke a parallel
     * strategy.
     *
     * @see strategyBatchSize for controlling strategies
     */
    readonly batchSize?: number;
    /**
     * When set to true, the next check on the resource ensures that it flushes through the stack
     */
    readonly forceLoad?: boolean;
    /**
     * Ensures that the resource is created
     */
    readonly forceCreate?: boolean;
    /**
     * Marks a collection as read-only - you'd don't get the ability to add items
     */
    readonly readonly?: boolean;
    /**
     * Marks a collection as mutable - you only get to remove/add items from the collection (you may or may
     * not be able to delete/create the items themselves)
     */
    readonly contributeonly?: boolean;

    /**
     * Change the strategy to locate a resource in a collection when syncing eg the resource in the collection
     * will be searched by only on link relation (default: Canonical|Self)
     *
     * @see {@link defaultFindResourceInCollectionStrategy}
     */
    readonly findResourceInCollectionStrategy?: <T extends Representation>(
        collection: CollectionRepresentation<T>,
        options?: ResourceQueryOptions,
    ) => T | undefined;

    /**
     *
     *
     * @see defaultUriListResolver
     */
    readonly uriListResolver?: UriListResolver;

    /**
     * A set of comparators for matching resources in the network of data (@link Differencer} to compute the identity
     * of an object based on a transformation
     */
    readonly comparators?: SyncComparator[];

    readonly fieldResolver?: FieldResolver;
    readonly resolver?: Resolver;

    readonly rel?: RelationshipType;
    readonly relOnDocument?: RelationshipType;
    readonly name?: string;
    readonly nameOnDocument?: string;
}
