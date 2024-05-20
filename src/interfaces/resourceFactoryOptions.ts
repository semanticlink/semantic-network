import { Status } from '../representation/status';
import { LinkedRepresentation, Uri } from 'semantic-link';
import { FeedItemRepresentation } from './feedItemRepresentation';
import { Tracked } from '../types/types';

export type ResourceType = 'singleton' | 'collection' | 'feed';

export type MakeSparseStrategy = (options?: ResourceFactoryOptions) => Tracked<LinkedRepresentation>;

export interface ResourceFactoryOptions {

    /**
     * The href set on the 'Self' link relation
     */
    readonly uri?: Uri;

    /**
     * The title set on the sparsely populated resource.
     */
    readonly title?: string;

    /**
     * The updated set on the sparsely populated resource.
     */
    readonly updated?: string;

    /**
     * The ETag set in the State on the sparsely populated resource.
     */
    readonly eTag?: string;

    /**
     * The 'last-modified' set in the State on the sparsely populated resource.
     */
    readonly lastModified?: string;

    /**
     * Explicitly set the {@link State} 'status' on the resource. Currently, when there is a uri, it is set to location
     * otherwise, set to unknown
     *
     * @see TrackedRepresentationFactory.make
     * @see State
     */
    readonly status?: Status;

    /**
     * Where the resource is sparse, the type can be explicitly set. Default is singleton
     *
     * Note: 'feed' is an internal type that generally should not be used/needed.
     */
    readonly sparseType?: ResourceType;

    /**
     * For {@link ResourceType} collection, default items can be added at creation time. Items are added as sparse representations
     */
    readonly defaultItems?: (Uri | FeedItemRepresentation)[];

    /**
     * Set a state on this data if it exists rather than a sparsely populated representation.
     *
     * When set with a {@link LinkedRepresentation}, the {@link State} will be initialised on the representation.
     * An initialised representation will be at worst sparse with a state ({@link Status.locationOnly}, {@link Status.virtual}).
     * At best, the representation is {@link Status.hydrated} when a resource is presented that has been retrieved across the wire.
     */
    readonly addStateOn?: LinkedRepresentation;

    /**
     * Internally used, to generate a items on a collection. Used in conjunction with {@link sparseType} 'feed'.
     */
    readonly feedItem?: FeedItemRepresentation;

    /**
     * Generate a resource from a feed item with a title from the given field attribute
     *
     * @default: name
     * @see SparseRepresentationFactory.defaultMappedTitleAttributeName
     */
    readonly mappedTitle?: string;

    /**
     * Generate a resource from a feed item with a title from the given field attribute
     *
     * @default: title
     * @see SparseRepresentationFactory.defaultMappedFromFeedItemFieldName
     */
    readonly mappedTitleFrom?: string;


    /**
     * Generate a resource from a feed item with an updated from the given field attribute
     *
     * @default: updatedAt
     * @see SparseRepresentationFactory.defaultMappedUpdatedAttributeName
     */
    readonly mappedUpdated?: string;

    /**
     * Generate a resource from a feed item with an updated from the given field attribute
     *
     * @default: updated
     * @see SparseRepresentationFactory.defaultMappedFromFeedItemUpdatedFieldName
     */
    readonly mappedUpdatedFrom?: string;

    /**
     * The strategy used to create sparse {@link LinkedRepresentation} objects. This allows to caller
     * to plug in an alternative implementation (say to implement a pooled resource strategy).
     */
    readonly makeSparseStrategy?: MakeSparseStrategy;
}
