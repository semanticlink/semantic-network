import anylogger from 'anylogger';
import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { ApiUtil } from '../apiUtil';
import { LinkRelation } from '../linkRelation';
import { Nullable, TrackedRepresentation } from '../types/types';
import { RepresentationUtil } from '../utils/representationUtil';
import { noopResolver } from '../representation/resourceMergeFactory';
import { PooledCollectionOptions } from '../interfaces/pooledCollectionOptions';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';

const log = anylogger('PooledCollectionUtil');


/**
 * Add to the resolver the mapping between the new document uri and the existing nod uri
 * @private
 */
function addToResolver<T extends LinkedRepresentation>(document: T, resource: T, options?: PooledCollectionOptions): T {

    const { resolver = noopResolver } = { ...options };

    if (LinkUtil.matches(document, LinkRelation.Self)) {
        const key = LinkUtil.getUri(document, LinkRelation.Self);
        const value = LinkUtil.getUri(resource, LinkRelation.Self);

        if (key && value && key !== value) {
            log.debug('resolver add key: %s --> %s', key, value);
            resolver.add(key, value);
        } else {
            log.debug('no resolution for %s on %s', value, key);
        } // key will resolve to Self if not found
    }
    return resource;
}

/**
 * Make a resource item inside a collection, add it to the resolver and
 * @return {Promise} containing the created resource
 * @private
 */
async function makeAndResolveResource<T extends LinkedRepresentation>(
    collectionResource: T,
    resourceDocument: T,
    options?: PooledCollectionOptions): Promise<T | undefined> {
    const result = await ApiUtil.create(resourceDocument, {
        ...options,
        on: collectionResource,
    });
    if (result) {
        log.info('Pooled resource created: created %s', LinkUtil.getUri(result as unknown as LinkedRepresentation, LinkRelation.Self));
        return addToResolver(resourceDocument, result as unknown as T, options);
    }
    return undefined;
}

export class PooledResourceUtil {

    /**
     * Used for provisioning a pooled resource. Based on
     * the differences it will resolve a resource and may create one in the process.
     *
     * A pooled collection lives outside of the current context that needs to be resolved. Examples similar to this
     * in other contexts are called meta-data or static collections. The main point is that resources from the pooled collection
     * are used by reference in the current collection.
     *
     * When pooled collection is read-only then no resources may be added from other contexts.
     *
     */
    static async sync<T extends LinkedRepresentation>(context: T, aDocument: T, options?: PooledCollectionOptions): Promise<Nullable<T>> {

        const { rel, resolver = noopResolver } = { ...options };

        // step 1: generate the context as a collection
        const resource = rel ?
            await ApiUtil.get(context, options) :
            context;

        // step 2: process
        if (resource && instanceOfCollection(resource)) {

            const uri = LinkUtil.getUri(resource, LinkRelation.Self);

            //
            // strategy one & two: it is simply found map it based on Self and/or mappedTitle
            //
            const existing = RepresentationUtil.findInCollection(resource, { where: aDocument });

            if (existing) {
                return addToResolver(aDocument, existing, options) as T;
            } else if (LinkUtil.getUri(aDocument, LinkRelation.Self)) {
                //
                // strategy three: check to see if Self is an actual resource anyway and map it if it is, otherwise make
                //
                const documentURI = LinkUtil.getUri(aDocument, LinkRelation.Self);
                if (documentURI) {
                    const resolvedUri = resolver.resolve(documentURI);
                    if (resolvedUri !== documentURI) {
                        const foundResource = RepresentationUtil.findInCollection(resource, { where: resolvedUri });
                        if (foundResource) {
                            return foundResource as T;
                        } else {
                            log.error('Unexpected error: resource \'%s\' is not found on %s', resolvedUri, uri);
                        }
                    } else {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        return await makeAndResolveResource(resource, aDocument, options) as unknown as T;
                    }
                }

            } else {
                // strategy four: make if we can because we at least might have the attributes
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                return await makeAndResolveResource(resource, aDocument, options) as unknown as T;
            }
        }

        if (resource && !instanceOfCollection(resource)) {
            log.error('resource of collection must be found at %s', LinkUtil.getUri(resource, LinkRelation.Self));
        }

        return undefined;
    }

    /**
     * Retrieves a resource from a named resource from the context of a given resource.
     *
     * @return {Promise<string>} containing the uri resource {@link LinkedRepresentation}
     */
    public static async get<T extends LinkedRepresentation, TResult extends LinkedRepresentation>(
        resource: T | TrackedRepresentation<T>,
        collectionName: string,
        collectionRel: RelationshipType,
        resourceDocument: TResult,
        options?: PooledCollectionOptions): Promise<TResult | undefined> {

        const result = await ApiUtil.get(resource, { ...options, rel: collectionRel });
        if (result) {
            log.debug('Pooled collection \'%s\' on %s', collectionName, LinkUtil.getUri(resource, LinkRelation.Self));
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore chaos in typing, sorry
            return await this.sync(result, resourceDocument, options);
        }
    }
}
