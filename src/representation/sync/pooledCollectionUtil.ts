import anylogger from 'anylogger';
import { CollectionRepresentation, LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { ApiUtil } from '../../apiUtil';
import { LinkRelation } from '../../linkRelation';
import { TrackedRepresentation } from '../../types/types';
import { RepresentationUtil } from '../../utils/representationUtil';
import { noopResolver } from '../resourceMergeFactory';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';

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
        } // key will resolve to self if not found
    }
    return resource;
}

/**
 * Make a resource item inside a collection, add it to the resolver and
 * @return {Promise} containing the created resource
 * @private
 */
async function makeAndResolveResource<T extends LinkedRepresentation>(collectionResource: T, resourceDocument: T, options?: PooledCollectionOptions): Promise<T | undefined> {
    const result = await ApiUtil.create(resourceDocument, {
        ...options,
        // @ts-ignore - typings seem wrong (predicate vs value)
        on: <T>() => collectionResource,
    });
    if (result) {
        log.info('Pooled resource created: created %s', LinkUtil.getUri(result as unknown as LinkedRepresentation, LinkRelation.Self));
        return addToResolver(resourceDocument, result as unknown as T, options);
    }
    return undefined;
}

export default class PooledCollectionUtil {

    /**
     * Used for provisioning a pooled collection (network of data) based on providing a document (resources). Based on
     * the differences it will resolve a resource and may create one in the process.
     *
     * A pooled collection lives outside of the current context that needs to be resolved. Examples similar to this
     * in other contexts are called meta-data or static collections. The main point is that resources from the pooled collection
     * are used by reference in the current collection.
     *
     * When pooled collection is read-only then no resources may be added from other contexts.
     *
     */
    static async sync<T extends LinkedRepresentation>(parentOrCollection: T, resourceDocument: T, options?: PooledCollectionOptions): Promise<T | undefined> {

        const { rel, resolver = noopResolver } = { ...options };

        const resource = rel ?
            await ApiUtil.get(parentOrCollection as TrackedRepresentation<T>, options) :
            parentOrCollection;

        const uri = LinkUtil.getUri(resource as TrackedRepresentation<T>, LinkRelation.Self);

        // strategy one & two: it is simply found map it based on self and/or mappedTitle
        const existing = RepresentationUtil.findInCollection(resource as unknown as CollectionRepresentation, { where: resourceDocument });

        if (existing) {
            return addToResolver(resourceDocument, existing, options) as T;
        } else if (LinkUtil.getUri(resourceDocument, LinkRelation.Self)) {
            // strategy three: check to see if self is an actual resource anyway and map it if it is, otherwise make
            const documentURI = LinkUtil.getUri(resourceDocument, LinkRelation.Self);
            if (documentURI) {
                const resolvedUri = resolver.resolve(documentURI);
                if (resolvedUri !== documentURI) {
                    const tryGetResource = RepresentationUtil.findInCollection(resource as unknown as CollectionRepresentation, { where: resolvedUri });
                    if (tryGetResource) {
                        return tryGetResource as T;
                    } else {
                        log.error('Unexpected error: resource \'%s\' is not found on %s', resolvedUri, uri);
                    }
                } else {
                    return await makeAndResolveResource(resource as T, resourceDocument, options) as T;
                }
            }

        } else {
            // strategy four: make if we can because we at least might have the attributes
            return await makeAndResolveResource(resource as T, resourceDocument, options) as T;
        }

        return undefined;
    }

    /**
     * Retrieves a resource from a named collection from the context of a given resource.
     *
     * @return {Promise<string>} containing the uri resource {@link LinkedRepresentation}
     */
    public static async get<T extends LinkedRepresentation>(
        resource: LinkedRepresentation,
        collectionName: string,
        collectionRel: RelationshipType,
        resourceDocument: T,
        options?: PooledCollectionOptions): Promise<T | undefined> {

        const result = await ApiUtil.get(resource as TrackedRepresentation<T>, { ...options, rel: collectionRel });
        if (result) {
            log.debug('Pooled collection \'%s\' on %s', collectionName, LinkUtil.getUri(resource, LinkRelation.Self));
            return await this.sync(result, resourceDocument as TrackedRepresentation<T>, options) as unknown as T;
        }
    }
}
