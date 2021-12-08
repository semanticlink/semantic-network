import { CollectionRepresentation, FeedRepresentation, LinkedRepresentation } from 'semantic-link';
import { SingletonRepresentation, state, Tracked } from '../types/types';
import { State } from './state';
import { Status } from './status';
import anylogger from 'anylogger';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { instanceOfFeed } from '../utils/instanceOf/instanceOfFeed';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { LinkRelation } from '../linkRelation';

const log = anylogger('SparseRepresentationFactory');

export class SparseRepresentationFactory {

    public static mappedTitleAttributeName = 'name' as const;

    /**
     * Returns a {@link LinkedRepresentation} with {@link State} initialised. An initialised representation will
     * be at worst sparse with a state ({@link Status.locationOnly}, {@link Status.virtual}). At best, the representation
     * is {@link Status.hydrated} when a resource is presented that has been retrieved across the wire.
     */
    public static make<T extends LinkedRepresentation | CollectionRepresentation>(options?: ResourceFactoryOptions): Tracked<T> {

        const { on } = { ...options };

        // create a sparse resource
        if (!on) {
            return SparseRepresentationFactory.makeSparse(options);
        }

        const existingResource = on;
        // attach state to existing representation
        if (!existingResource) {
            // still need to create a sparse resource!
            return SparseRepresentationFactory.makeSparse({ ...options, on: undefined });
        } else {
            return SparseRepresentationFactory.makeHydrated(existingResource, options);
        }
    }

    private static makeHydrated<T extends LinkedRepresentation>(
        resource: LinkedRepresentation,
        options?: ResourceFactoryOptions): Tracked<T> {
        const {
            sparseType = 'singleton',
            status = Status.hydrated,
        } = { ...options };

        if (sparseType === 'feed') {
            throw new Error('Feed type not implemented. Sparse representation must be singleton or collection');
        }

        // make up a tracked resource for both singleton and collection (and forms)
        // this will include links
        const tracked = {
            ...resource,
            [state]: new State(status),
        };

        if (!instanceOfCollection(resource)) {
            // make a singleton (or form)
            return tracked as Tracked<T>;
        } else {
            // create collection

            // collection requires feed items to be sparsely populated
            // should be able to know from feedOnly state
            const feedRepresentation = resource as unknown as FeedRepresentation;
            // TODO: need to know this coming out of load
            if (!instanceOfFeed(resource)) {
                log.warn('Resource does not look like a feed');
            }

            const items = feedRepresentation
                .items
                .map(x => this.makeSparse<SingletonRepresentation>({
                    ...options,
                    sparseType: 'feed',
                    feedItem: x,
                }));

            // make collection and items
            // note: the assumption is that collections don't have other attributes
            return {
                ...tracked,
                items: [...items],
                // TODO: struggling with typing on CollectionRepresentation<T> where the items are a TrackedRepresentation<T>
            } as unknown as Tracked<T>;

        }
    }

    private static makeSparse<T extends LinkedRepresentation>(options?: ResourceFactoryOptions): Tracked<T> {
        let { status, uri } = { ...options };
        const { title = undefined, mappedTitle = this.mappedTitleAttributeName } = { ...options };

        if (!status) {
            if (uri) {
                status = Status.locationOnly;
            } else {
                status = Status.virtual;
            }
        }

        /** rather than populate with undefined, default to empty string */
        uri = uri ?? '';

        const sparseResource = {
            [state]: new State(status),
            links: [{
                rel: LinkRelation.Self,
                href: uri,
            }],
        } as Tracked<T>;

        const { sparseType = 'singleton' } = { ...options };

        if (sparseType === 'singleton') {

            // feed items come back in on a singleton and have the 'title' mapped to an attribute
            // note: 'name' isn't likely to be configured but could be (it also could be injected from global configuration)
            if (title) {
                return { ...sparseResource, [mappedTitle]: title };
            }
            return sparseResource;
        } else if (sparseType === 'collection') {

            const { defaultItems = [] } = { ...options };

            const items = defaultItems.map(item => {
                if (typeof item === 'string' /* Uri */) {
                    return this.makeSparse({ uri: item });
                } else {
                    return this.makeSparse({ uri: item.id, title: item.title });
                }
            });

            return { ...sparseResource, items };
        } else /* feedItem */ {
            // note: sparseType: 'feed' is an internal type generated from {@link makeHydrated} to populate items
            const { feedItem } = { ...options };
            if (feedItem) {
                return this.makeSparse({ uri: feedItem.id, title: feedItem.title });
            } else {
                log.error('Cannot create resource of type \'feedItem\' should be set - returning unknown');
                return this.makeSparse({ status: Status.unknown });
            }
        }
    }

}
