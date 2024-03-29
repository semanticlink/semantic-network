import { LinkedRepresentation } from 'semantic-link';
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
import { Nullable, Tracked } from '../types/types';
import { LinkRelation } from '../linkRelation';
import { LoaderJobOptions } from '../interfaces/loader';

const log = anylogger('get');

/**
 * A subset of the {@link ApiOptions} that are appropriate for a HTTP GET.
 *
 * @see ApiOptions
 */
export type ApiGetOptions = ResourceFactoryOptions &
    ResourceQueryOptions &
    ResourceLinkOptions &
    HttpRequestOptions &
    ResourceMergeOptions &
    ResourceFetchOptions &
    ResourceUpdateOptions &
    LoaderJobOptions;
/**
 * Retrieve a resource based on its context and options, and its current state (ie hydrated or not)
 *
 * Note: a returned resource will not always be the same (ie self) but rather a different linked resource.
 *
 * TODO: where 'named' resources are known, return that type based on the 'rel' in options.
 */
export async function get<TReturn extends LinkedRepresentation,
    T extends LinkedRepresentation | TReturn = LinkedRepresentation,
    TResult extends TReturn = T extends TReturn ? T : TReturn>(
    resource: T | Tracked<T>,
    options?: ApiGetOptions): Promise<Nullable<TResult | Tracked<TResult>>> {

    const {
        rel = undefined,
        where = undefined,
    } = { ...options };

    const relIsNotSelfOrEmpty = rel && rel !== LinkRelation.Self;

    // look at the context resource and ensure that it is first hydrated before loading sub resources
    if (relIsNotSelfOrEmpty) {
        log.debug('get context resource on \'self\'');
        resource = await TrackedRepresentationFactory.load(resource, { ...options, rel: LinkRelation.Self });
    }

    // find specific item in collection
    if (where) {
        log.debug('using \'where\' to locate resource on get');

        // when combined with rel, the sub resource should be the collection
        if (relIsNotSelfOrEmpty) {
            const namedSubResource = await NamedRepresentationFactory.load(resource, options);
            if (namedSubResource) {
                log.debug('named sub resource found on \'%s\'', rel);
                resource = namedSubResource as Tracked<T>;
                // now that sub resource is loaded, re-contextualise to this resource (ie will become 'self')
                delete options?.rel;
            } else {
                log.warn('named sub resource not found on \'%s\'', rel);
            }
        }

        if (instanceOfCollection(resource)) {
            log.debug('get collection resource (with items: %s)', options?.includeItems || false);
            // synchronise collection by applying all current rules (eg includeItems)
            const collection = await TrackedRepresentationFactory.load(resource, options);
            // then check for existence
            const item = RepresentationUtil.findInCollection(collection, options);
            if (item) {
                log.debug('item in collection found');
                return await TrackedRepresentationFactory.load(item, options) as Tracked<TResult>;
            } else {
                log.debug('item in collection not found ');
                return undefined;
            }
        } else {
            log.warn('Where options cannot be used outside of a collection, skipping where');
            // fall through to return context resource
        }
    }

    // named resources
    // do not add 'self' as sub resource
    if (relIsNotSelfOrEmpty) {
        log.debug('get named singleton sub resource');
        return await NamedRepresentationFactory.load(resource, options);
    }
    // otherwise all resources
    log.debug('get resource');
    return await TrackedRepresentationFactory.load(resource, options) as unknown as TResult;
}
