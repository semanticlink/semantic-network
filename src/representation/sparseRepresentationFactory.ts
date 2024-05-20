import {
    CollectionRepresentation,
    FeedRepresentation,
    instanceOfLinkedRepresentation,
    LinkedRepresentation,
    LinkUtil,
    Uri,
} from 'semantic-link';
import { SingletonRepresentation, state, Tracked } from '../types/types';
import { State } from './state';
import { Status } from './status';
import anylogger from 'anylogger';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { instanceOfFeed } from '../utils/instanceOf/instanceOfFeed';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { LinkRelation } from '../linkRelation';
import { CanonicalOrSelf } from '../utils/comparators/canonicalOrSelf';
import { FeedItemRepresentation } from '../interfaces/feedItemRepresentation';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { instanceOfTrackedRepresentation } from '../utils/instanceOf/instanceOfTrackedRepresentation';

const log = anylogger('SparseRepresentationFactory');

/**
 * A factory for performing the initial construction of tracked resources.
 *
 * This factory is responsible for performing a logical 'new' of the in memory object
 * used to represent resources. These objects have a 'state' object of type {@link State}
 * that is used to track and manage the resources.
 *
 * If the across the wire representation is available it can be provided via
 * the {@link ResourceFactoryOptions.addStateOn} property to provide an initial values
 * for the resource. If the values are not provided then the resource is marked
 * as being in the {@link Status.locationOnly} state (i.e. sparely populated).
 *
 * This factory is a pluggable strategy via the {@link ResourceFactoryOptions.makeSparseStrategy}. By
 * default, the strategy is to create new instances for every instance of a resource. Implementations
 * are provided to allowed pooled instances.
 */
export class SparseRepresentationFactory {

    public static defaultMappedTitleAttributeName = 'name' as const;
    public static defaultMappedFromFeedItemFieldName = 'title' as const;
    public static defaultMappedUpdatedAttributeName = 'updatedAt' as const;
    public static defaultMappedFromFeedItemUpdatedFieldName = 'updated' as const;
    public static defaultMappedFromFeedItemETagFieldName = 'eTag' as const;

    /**
     * A simple facade to allow the make() method to be provided by an alternative strategy.
     *
     * @see {defaultMakeStrategy}
     */
    public static make<T extends LinkedRepresentation | CollectionRepresentation>(
        options?: ResourceFactoryOptions): Tracked<T> {
        // Get the optional makeSparse strategy defaulting to the standard default implementation below.
        const { makeSparseStrategy = SparseRepresentationFactory.defaultMakeStrategy } = { ...options };
        return makeSparseStrategy(options) as Tracked<T>;
    }

    /**
     * Returns a {@link LinkedRepresentation} with {@link State} initialised. An initialised representation will
     * be at worst sparse with a state ({@link Status.locationOnly}, {@link Status.virtual}). At best, the representation
     * is {@link Status.hydrated} when a resource is presented that has been retrieved across the wire.
     */
    public static defaultMakeStrategy<T extends LinkedRepresentation | CollectionRepresentation>(
        options?: ResourceFactoryOptions): Tracked<T> {
        const { addStateOn, ...opts } = { ...options };
        if (addStateOn) {
            return SparseRepresentationFactory.makeHydrated<T>(addStateOn, opts);
        } else {
            return SparseRepresentationFactory.makeSparse<T>(opts);
        }
    }

    /**
     * Create sparse items from a 'pool'. The pool is a single collection resource, which is used
     * as both a source of items and a location to store new (sparse) items.
     *
     * This strategy allows the caching of resources in a memory conservative way so that the same
     * resource is not loaded twice. More importantly this also means that if the application/user
     * has a view of those resources then the view will be the same.
     *
     * It is assumed that the pooled collection is logically backed/represented by the set of all
     * possible items, whereas the specific collection is a subset of those items.
     */
    public static pooledCollectionMakeStrategy<T extends LinkedRepresentation | CollectionRepresentation>(
        pool: CollectionRepresentation, options?: ResourceFactoryOptions): Tracked<T> {
        const { addStateOn } = { ...options };
        if (addStateOn) {
            return SparseRepresentationFactory.makeHydratedPoolCollection(addStateOn, pool, options);
        } else {
            return SparseRepresentationFactory.makeSparse({ ...options, addStateOn: undefined });
        }
    }

    /**
     * Find the first matching item in a collection. Match by URI.
     *
     * At this stage, it is really unlikely that this will ever match on eTag for identity at this point. ETag
     * checking is later on in the pipeline (ie versioning is later)
     */
    public static firstMatchingFeedItem<T extends LinkedRepresentation>(
        collection: CollectionRepresentation<T>, id: Uri): T | undefined {
        return collection
            .items
            .find((anItem) => LinkUtil.getUri(anItem, CanonicalOrSelf) === id);
    }

    /**
     * Create sparse item from a 'pool'. The pool is a single collection resource, which is used
     * as both a source of items and a location to store new (sparse) items.
     *
     * This strategy allows the caching of resources in a memory conservative way so that the same
     * resource is not loaded twice. More importantly this also means that if the application/user
     * has a view of those resources then the view will be the same.
     *
     * It is assumed that the pooled collection is logically backed/represented by the set of all
     * possible items, whereas the specific collection is a subset of those items.
     */
    public static pooledSingletonMakeStrategy<T extends LinkedRepresentation | CollectionRepresentation>(
        pool: CollectionRepresentation, options?: ResourceFactoryOptions): Tracked<T> {
        const { addStateOn, ...opts } = { ...options };
        if (addStateOn) {
            return SparseRepresentationFactory.makeHydratedPoolSingleton(addStateOn, pool, opts);
        } else {
            return SparseRepresentationFactory.makeSparsePooled(pool, opts);
        }
    }

    private static makeHydrated<T extends LinkedRepresentation>(
        resource: LinkedRepresentation,
        options?: ResourceFactoryOptions): Tracked<T> {
        const {
            sparseType = 'singleton',
            status = Status.hydrated,
            eTag = undefined,
        } = { ...options };

        if (sparseType === 'feed') {
            throw new Error('Feed type not implemented. Sparse representation must be singleton or collection');
        }

        /*
         * The passed in resource cannot be mutated because in libraries like Vue2 the bindings will be lost
         */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        resource[state] = new State(status, eTag);

        if (instanceOfCollection(resource)) {
            // collection requires feed items to be sparsely populated
            // should be able to know from feedOnly state
            // TODO: need to know this coming out of load
            if (instanceOfFeed(resource)) {
                // make collection items
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                resource.items = (resource as unknown as FeedRepresentation)
                    .items
                    .map(x => this.makeSparse<SingletonRepresentation>({
                        ...options,
                        sparseType: 'feed',
                        feedItem: x,
                    }));
            } else {
                /*
                 * Case where the resources already exist and state is to be added after it has been added in-memory
                 */
                for (const item of resource.items) {
                    if (instanceOfLinkedRepresentation(resource) && !instanceOfTrackedRepresentation(resource)) {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        item[state] = new State(status);
                    }
                }
            }
        } // else singleton
        return resource as Tracked<T>;
    }

    /**
     *  The resource is to be made as a sparse resource as there is no data provided via
     *  the {@link ResourceFactoryOptions.addStateOn} property.
     */
    private static makeSparse<T extends LinkedRepresentation>(options?: ResourceFactoryOptions): Tracked<T> {
        const {
            uri = '', // rather than populate with undefined, default to empty string (unclear why this is a good idea)
            title = undefined,
            updated = undefined,
            eTag = undefined,
            status = options?.uri ? Status.locationOnly : Status.virtual,
            mappedTitle = this.defaultMappedTitleAttributeName,
            mappedTitleFrom = this.defaultMappedFromFeedItemFieldName,
            mappedUpdated = this.defaultMappedUpdatedAttributeName,
            mappedUpdatedFrom = this.defaultMappedFromFeedItemUpdatedFieldName,
            mappedETagFrom = this.defaultMappedFromFeedItemETagFieldName,
            sparseType = 'singleton',
        } = { ...options };

        const sparseResource = {
            [state]: new State(status, eTag, updated),
            links: [{
                rel: LinkRelation.Self,
                href: uri,
            }],
        } as Tracked<T>;

        if (sparseType === 'singleton') {

            // feed items come back in on a singleton and have the 'title' mapped to an attribute
            // note: 'name' isn't likely to be configured but could be (it also could be injected from global configuration)
            return {
                ...sparseResource,
                ...(title && { [mappedTitle]: title }),
                ...(updated && { [mappedUpdated]: updated }),
            };
        } else if (sparseType === 'collection') {
            const { defaultItems = [] } = { ...options };

            const items = defaultItems.map(item => {
                if (typeof item === 'string' /* Uri */) {
                    return this.makeSparse({ uri: item });
                } else {
                    return this.makeSparse({
                        uri: item.id,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        title: item[mappedTitleFrom],
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        updated: item[mappedUpdatedFrom],
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        eTag: item[mappedETagFrom],
                    });
                }
            });

            return { ...sparseResource, items };
        } else if (sparseType === 'feed') /* feedItem */ {
            // note: sparseType: 'feed' is an internal type generated from {@link makeHydrated} to populate items
            const { feedItem } = { ...options };
            if (feedItem) {
                return this.makeSparse({
                    uri: feedItem.id,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    title: feedItem[mappedTitleFrom],
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    updated: feedItem[mappedUpdatedFrom],
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    eTag: feedItem[mappedETagFrom],
                });
            } else {
                log.error('Cannot create resource of type \'feedItem\' should be set - returning unknown');
                return this.makeSparse({ status: Status.unknown });
            }
        } else {
            log.error('Unsupported type %s', sparseType);
            return this.makeSparse({ status: Status.unknown });
        }
    }

    /**
     * Make a collection (that is not pools) from members that are pools.
     */
    private static makeHydratedPoolCollection<T extends LinkedRepresentation>(
        resource: LinkedRepresentation,
        pool: CollectionRepresentation,
        options?: ResourceFactoryOptions): Tracked<T> {
        const {
            sparseType = 'singleton',
            status = Status.hydrated,
            eTag = undefined,
        } = { ...options };
        if (sparseType === 'feed') {
            throw new Error('Feed type not implemented. Sparse representation must be singleton or collection');
        }

        // make up a tracked resource for both singleton and collection (and forms)
        // this will include links
        const tracked = <Tracked<T>>{
            ...resource,
            [state]: new State(status, eTag /* currently no last modified passed through */),
        };

        if (instanceOfCollection(resource)) {
            // collection requires feed items to be sparsely populated
            // should be able to know from feedOnly state
            const items = this.onAsFeedRepresentation(resource)
                .items
                .map(x => this.makePooledFeedItemResource(pool, x, options));

            // Make the collection, with the pooled items
            return {
                ...tracked,
                items: [...items],
            };
        } else { // the resource is a singleton (or a feed, ...)
            // make a singleton (or form)
            return tracked as Tracked<T>;
        }
    }

    /**
     * Make an item for a collection using a pool as the source for items.
     */
    private static makePooledFeedItemResource(
        pool: CollectionRepresentation,
        item: FeedItemRepresentation,
        options?: ResourceFactoryOptions) {

        const firstMatchingItem = this.firstMatchingFeedItem(pool, item.id);

        // when found by id merge across the title and the etag
        // which will then make it stale, etc
        if (firstMatchingItem) {
            const {
                mappedTitleFrom = this.defaultMappedFromFeedItemFieldName,
                mappedETagFrom = this.defaultMappedFromFeedItemETagFieldName,
                mappedUpdatedFrom = this.defaultMappedFromFeedItemUpdatedFieldName,
            } = { ...options };

            const etag = item[mappedETagFrom];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const title = item[mappedTitleFrom];

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const lastModified = item[mappedUpdatedFrom];

            // const resourceFactoryOptions = { title, eTag: etag } as ResourceFactoryOptions;
            return this.mergeFeedItem(firstMatchingItem, { ...options, title, eTag: etag, lastModified }); // item from the pool
        } else {
            const newItem = this.makeSparse<SingletonRepresentation>({
                ...options,
                sparseType: 'feed',
                feedItem: item,
            });
            pool.items.unshift(newItem); // put the item at the beginning of the pool
            return newItem;
        }
    }

    /**
     * if an incoming feed item is already in the collection AND the incoming has the eTag as part of the feed
     * then check if the existing item is stale (ie stale if eTags don't match and requires fetch across the wire)
     *
     * note: combined with {@link includeItems} items with eTag changes should be refreshed
     */
    private static mergeFeedItemETag(
        resource: LinkedRepresentation | Tracked,
        options?: ResourceFactoryOptions): LinkedRepresentation {

        const { eTag, lastModified } = { ...options };

        if (instanceOfTrackedRepresentation(resource)) {
            // factory passed in eTag on newly created resources
            if (eTag) {
                const previousFeedETag = TrackedRepresentationUtil.getFeedETag(resource);
                if (previousFeedETag !== eTag) {
                    const state = TrackedRepresentationUtil.getState(resource);
                    state.previousStatus = state.status;
                    state.status = Status.staleFromETag;
                    // update the feed item eTag with the new incoming—which mostly is the same but can be updated
                    TrackedRepresentationUtil.setFeedETag(resource, eTag, lastModified);
                }
                // look inside the resource that may have been already hydrated and has an eTag value in the headers
            } else if (TrackedRepresentationUtil.hasStaleFeedETag(resource)) {
                const state = TrackedRepresentationUtil.getState(resource);
                state.previousStatus = state.status;
                state.status = Status.staleFromETag;
            } // else eTags match, don't update
        } else {
            log.error('Matched feed item in collection should already be a tracked resource. Developer error');
        }
        return resource;
    }

    /**
     *  The resource is to be made as a sparse resource as there is no data provided via
     *  the {@link ResourceFactoryOptions.addStateOn} property. Iff a link has been provided
     *  can the item be fetched from or stored into the pool.
     */
    private static makeSparsePooled<T extends LinkedRepresentation>(
        pool: CollectionRepresentation,
        options?: ResourceFactoryOptions): Tracked<T> {
        const { uri } = { ...options };
        if (uri) {
            const firstMatchingItem = this.firstMatchingFeedItem(pool, uri);
            if (firstMatchingItem) {
                return this.mergeFeedItem(firstMatchingItem, options) as Tracked<T>; // item from the pool
            } else {
                const sparse = this.makeSparse<T>(options);
                pool.items.unshift(sparse);   // add item to the pool
                return sparse;
            }
        } else {
            // the URI is not known, so return a 'new' sparse item and do not store it in the pool
            return this.makeSparse<T>(options); // not eligible for the pool
        }
    }

    /**
     * Make a collection (that is not pools) from members that are pools.
     */
    private static makeHydratedPoolSingleton<T extends LinkedRepresentation>(
        resource: LinkedRepresentation,
        pool: CollectionRepresentation,
        options?: ResourceFactoryOptions): Tracked<T> {
        const uri = LinkUtil.getUri(resource, CanonicalOrSelf);
        if (uri) {

            const firstMatchingItem = this.firstMatchingFeedItem(pool, uri);
            if (firstMatchingItem) {
                return this.mergeFeedItem(firstMatchingItem, options) as Tracked<T>; // item from the pool
            } else {
                const hydrated = this.makeHydrated<T>(resource, options);
                pool.items.unshift(hydrated);   // add item to the pool
                return hydrated;
            }
        } else {
            return this.makeHydrated<T>(resource, options);
        }
    }

    private static mergeFeedItem<T extends LinkedRepresentation>(resource: T, options?: ResourceFactoryOptions): Tracked<T> {
        // incoming changes are merged onto the existing: name, title and eTags (which change state)
        this.mergeFeedItemFields(resource, options);
        return this.mergeFeedItemETag(resource, options) as Tracked<T>;
    }

    /**
     * Any resource requires incoming sparse representation options to be merged into existing resources. This method
     * will follow any options override mappings
     *
     * Note: in practice, this means that incoming feed will be mapped back onto the UI with new feed titles/updatedAt
     */
    private static mergeFeedItemFields(resource: LinkedRepresentation, options?: ResourceFactoryOptions): LinkedRepresentation {
        const {
            title = undefined,
            updated = undefined,
            mappedTitle = this.defaultMappedTitleAttributeName,
            mappedUpdated = this.defaultMappedUpdatedAttributeName,
        } = { ...options };

        if (title) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            resource[mappedTitle] = title;
        }
        if (updated) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            resource[mappedUpdated] = updated;
        }
        return resource;
    }

    /**
     * Get the {@link ResourceFactoryOptions.addStateOn} data as a {@link FeedRepresentation}.
     */
    private static onAsFeedRepresentation(resource: LinkedRepresentation): FeedRepresentation {
        if (instanceOfFeed(resource)) {
            return resource;
        } else {
            log.warn('Resource does not look like a feed');
            return resource as unknown as FeedRepresentation; // return it anyway.
        }
    }
}

export const defaultMakeStrategy = SparseRepresentationFactory.defaultMakeStrategy;
export const pooledCollectionMakeStrategy = SparseRepresentationFactory.pooledCollectionMakeStrategy;
export const pooledSingletonMakeStrategy = SparseRepresentationFactory.pooledSingletonMakeStrategy;
