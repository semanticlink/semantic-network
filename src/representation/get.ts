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
import { Nullable, TrackedRepresentation } from '../types/types';
import { LinkRelation } from '../linkRelation';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { LoaderJobOptions } from '../interfaces/loader';

const log = anylogger('get');


/*
export async function t<TReturn extends LinkedRepresentation,
    T extends LinkedRepresentation | TReturn = LinkedRepresentation,
    TResult extends TReturn = T extends TReturn ? T : TReturn>(
    resource: T | TrackedRepresentation<T>):
    Promise<Nullable<TResult | TrackedRepresentation<TResult>>> {
    if (resource) {
        return await TrackedRepresentationFactory.load(resource) as unknown as TResult;
    }
    // return undefined;
}

interface F extends LinkedRepresentation {
    name: string;
}

interface Z extends LinkedRepresentation {
    name: string;
}

interface FColl extends CollectionRepresentation<F> {
}

async function f() {

    const newVar: Z = { name: 'dfdf', links: [] };
    const j = await t(newVar);
    const h = await t<Z>(newVar);
    const l = await t<F>(newVar);
    const i = await t<FColl>(newVar);
    const k = await t<FColl, Z>(newVar);
    const m = await t<FColl, F>(newVar);

    console.log(j, h , i, k, l, m);

    const newColl: FColl = {
        links: [],
        items: []
    }

    const a = await t<FColl>(newColl);
    const a1 = await t(newColl);
    const a2 = await t(newColl) as Unbox<FColl>;

}
*/

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
    resource: T | TrackedRepresentation<T>,
    options?: ResourceFactoryOptions &
        ResourceQueryOptions &
        ResourceLinkOptions &
        HttpRequestOptions &
        ResourceMergeOptions &
        ResourceFetchOptions &
        ResourceUpdateOptions &
        LoaderJobOptions): Promise<Nullable<TResult | TrackedRepresentation<TResult>>> {

    const {
        rel = undefined,
        where = undefined,
    } = { ...options };

    // look at the context resource and ensure that it is first hydrated before loading sub resources
    if (rel && rel !== LinkRelation.Self && TrackedRepresentationUtil.needsFetchFromState(resource as TrackedRepresentation)) {
        log.debug('load self context resource');
        await TrackedRepresentationFactory.load(resource, { ...options, rel: LinkRelation.Self });
    }

    // find specific item in collection
    if (where) {

        // when combined with rel, the sub resource should be the collection
        if (rel && rel !== LinkRelation.Self) {
            const namedSubResource = await NamedRepresentationFactory.load(resource, options);
            if (namedSubResource) {
                resource = namedSubResource as TrackedRepresentation<T>;
                // now that sub resource is loaded, re-contextualise to this resource (ie will become 'self')
                delete options?.rel;
            }
        }

        if (instanceOfCollection(resource)) {
            // synchronise collection by applying all current rules (eg includeItems)
            const collection = await TrackedRepresentationFactory.load(resource, options);
            // then check for existence
            const item = RepresentationUtil.findInCollection(collection, options);
            if (item) {
                log.debug('Item found in collection');
                return await TrackedRepresentationFactory.load(item, options) as TrackedRepresentation<TResult>;
            } else {
                log.debug('Item not found in collection');
                return undefined;
            }
        } else {
            log.warn('Where options cannot be used outside of a collection, skipping where');
            // fall through to return context resource
        }
    }

    // named resources
    // do not add 'self' as sub resource
    if (rel && rel !== LinkRelation.Self) {
        return await NamedRepresentationFactory.load(resource, options);
    }

    // otherwise all resources
    return await TrackedRepresentationFactory.load(resource, options) as unknown as TResult;
}
