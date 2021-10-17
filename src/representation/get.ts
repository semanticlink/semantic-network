import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { NamedRepresentationFactory } from './namedRepresentationFactory';
import { TrackedRepresentationFactory } from './trackedRepresentationFactory';
import { ResourceQueryOptions } from '../interfaces/resourceQueryOptions';
import { ResourceLinkOptions } from '../interfaces/resourceLinkOptions';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { ResourceMergeOptions } from '../interfaces/resourceAssignOptions';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { RepresentationUtil } from '../utils/representationUtil';
import anylogger from 'anylogger';
import { ResourceUpdateOptions } from '../interfaces/resourceUpdateOptions';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { TrackedRepresentation } from '../types/types';

const log = anylogger('get');

/**
 *
 * TODO: accept but don't require TrackedRepresentation interface
 *
 * @param resource
 * @param options
 */
export async function get<T extends LinkedRepresentation,
    U extends T | CollectionRepresentation<T>,
    TResult extends LinkedRepresentation = TrackedRepresentation<U>>(
    resource: T | TrackedRepresentation<T>,
    options?: ResourceFactoryOptions &
        ResourceQueryOptions &
        ResourceLinkOptions &
        HttpRequestOptions &
        ResourceMergeOptions &
        ResourceFetchOptions &
        ResourceUpdateOptions): Promise<TResult | undefined> {

    const {
        rel = undefined,
        where = undefined,
    } = { ...options };

    // find specific item in collection
    if (where) {
        if (instanceOfCollection(resource)) {
            // refresh collection first
            const collection = await TrackedRepresentationFactory.load(resource, options);
            // then check for existence
            const item = RepresentationUtil.findInCollection(collection, options);
            if (item) {
                return await TrackedRepresentationFactory.load(item, options) as TResult;
            } else {
                log.debug('Item not found in collection');
                return;
            }
        } else {
            log.warn('Where options cannot be used outside of a collection, skipping where');
            // fall through to return context resource
        }
    }

    // named resources
    if (rel) {
        return await NamedRepresentationFactory.load(resource, options);
    }

    // otherwise all resources
    return await TrackedRepresentationFactory.load(resource, options) as unknown as TResult;
}
