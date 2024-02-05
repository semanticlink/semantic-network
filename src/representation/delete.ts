import { LinkedRepresentation } from 'semantic-link';
import { TrackedRepresentationFactory } from './trackedRepresentationFactory';
import { ResourceQueryOptions } from '../interfaces/resourceQueryOptions';
import { ResourceLinkOptions } from '../interfaces/resourceLinkOptions';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { RepresentationUtil } from '../utils/representationUtil';
import anylogger from 'anylogger';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { Tracked } from '../types/types';
import { ResourceDeleteOptions } from '../interfaces/resourceDeleteOptions';
import { Status } from './status';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';

const log = anylogger('delete');

/**
 * A subset of the {@link ApiOptions} that are appropriate for a HTTP DELETE.
 *
 * @see ApiOptions
 */
export type ApiDeleteOptions = ResourceDeleteOptions &
    ResourceFactoryOptions &
    ResourceQueryOptions &
    ResourceLinkOptions &
    HttpRequestOptions &
    ResourceFetchOptions;

/**
 *
 * TODO: accept but don't require TrackedRepresentation interface
 * @param resource
 * @param options
 * @returns removed representation or default
 */
export async function del<T extends LinkedRepresentation>(
    resource: T | Tracked<T>,
    options?: ApiDeleteOptions): Promise<T | undefined> {

    const {
        where = undefined,
        removeOnDeleteItem = true,
        reloadOnDelete = false,
    } = { ...options };

    // find specific item in collection to delete
    if (where) {
        if (instanceOfCollection(resource)) {
            // refresh collection first
            const collection = await TrackedRepresentationFactory.load(resource, options);
            if (instanceOfCollection(collection)) {
                // then check for existence
                // TODO: needs to process collection<T & LocalState> rather than collection<T>
                const item = RepresentationUtil.findInCollection(collection, options);
                if (item) {
                    const deletedResource = await TrackedRepresentationFactory.del(item, options);
                    if (deletedResource && removeOnDeleteItem) {
                        TrackedRepresentationFactory.removeCollectionItem(collection, deletedResource);
                    }
                    return deletedResource as T;
                } else {
                    log.debug('Item not found in collection');
                    return;
                }
            }

        } else {
            log.warn('Where options cannot be used outside of a collection, skipping where');
            // fall through to return context resource
        }
    }

    if (instanceOfCollection(resource)) {
        log.debug('Attempting to delete collection resource');
    }

    const deletedResource = await TrackedRepresentationFactory.del(resource, options);

    if (!reloadOnDelete) {
        return deletedResource;
    }

    // some deleted resources are only logically deleted and thus attributes are updates
    // reload from the server
    // the base logic is that once deleted, it is not retrieved again, so set to stale
    TrackedRepresentationUtil.getState(deletedResource as Tracked<T>).status = Status.stale;
    return await TrackedRepresentationFactory.load(deletedResource, options);
}
