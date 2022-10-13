import { CollectionRepresentation, LinkUtil } from 'semantic-link';
import { Document, Representation, Tracked } from '../types/types';
import { DocumentRepresentation } from '../interfaces/document';
import { StrategyType } from '../interfaces/sync/types';
import { SyncOptions } from '../interfaces/sync/syncOptions';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { NamedRepresentationFactory } from '../representation/namedRepresentationFactory';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { ApiUtil } from '../apiUtil';
import { LinkRelation } from '../linkRelation';
import { SyncUtil } from './syncUtil';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { instanceOfDocumentCollection } from '../utils/instanceOf/instanceOfDocumentCollection';
import { instanceOfDocumentSingleton } from '../utils/instanceOf/instanceOfDocumentSingleton';
import { RepresentationUtil } from '../utils/representationUtil';
import anylogger from 'anylogger';

const log = anylogger('syncResource');

/**
 * Sync resources between two networks of data
 *
 * There six scenarios:
 *
 *  key:  x - undefined
 *        + - specified
 *  [empty] - not required
 *
 *                         options                    resource                 document
 *                     rel    relOnDocument     singleton  collection   singleton  collection
 *  1.                  x        x                 +                        +
 *  2.                  +        +
 *  3.                  x        x                 +                        +
 *  4.                  +        x                                          +
 *  5.                  x        x                             +                      +
 *  6.                  +        x                                                    +
 *
 *
 * Strategy One
 * ============
 *
 * Retrieves a resource and synchronises (its attributes) from the document
 *
 * Note: this is used for syncing two documents through their parents
 *
 *
 * @example
 *
 *     Resource               Document
 *
 *                  sync
 *     +-----+                +-----+
 *     |     |  <-----------+ |     |
 *     |     |                |     |
 *     +-----+                +-----+
 *
 *
 * Strategy Two
 * ============
 *
 * Retrieves a singleton resource on a parent resource and updates (its
 * attributes) based on a singleton of the same name in the given parent document.
 *
 * The parent maybe either a collection resource or a singleton resource
 *
 * Note: this is used for syncing two documents through their parents
 *
 * @example
 *
 *
 *     parent     singleton           singleton   parent
 *     Resource    Resource            Document   Document
 *
 *     +----------+                            +---------+
 *     |          |            sync            |         |
 *     |          +-----+                +-----+         |
 *     |     Named|     |  <-----------+ |     |Named    |
 *     |          |     |                |     |         |
 *     |          +-----+                +-----+         |
 *     |          |                            |         |
 *     |          |                       ^    |         |
 *     +----------+                       |    +---------+
 *                                        |
 *                                        +
 *                                        looks for
 *
 * Strategy Three
 * ==============
 *
 *
 * Retrieves a resource item from a resource collection and synchronises (its attributes) from the document.
 *
 * @example
 *
 *     resource
 *     Collection         Document
 *
 *     +-----+
 *     |     |
 *     |     |
 *     +-----+    sync
 *         X                +---+
 *         X  <-----------+ | x |
 *         X                +---+
 *           items
 *
 * Strategy Four
 * =============
 *
 *
 * Retrieves a parent resource and its named collection with items (sparsely populated), finds the item in that
 * collection and then synchronises (its attributes) with the document.
 *
 *  @example
 *
 *      parent      resource
 *      Resource    Collection        Document
 *
 *      +----------+
 *      |          |
 *      |          +-----+
 *      |     Named|     |
 *      |          |     |
 *      |          +-----+    sync
 *      |          |   X                +---+
 *      |          |   X  <-----------+ | x |
 *      +----------+   X                +---+
 *                       items
 *
 * Strategy Five
 * =============
 *
 *
 * Retrieves a collection resource with items (sparsely populated), then synchronises the
 * collection items where each item may be updated (its attributes), a new item created or an item removed.
 *
 *  @example
 *
 *     resource              document
 *     Collection            Collection
 *
 *
 *                  sync
 *     +-----+                +-----+
 *     |     |  <-----------+ |     |
 *     |     |                |     |
 *     +-----+                +-----+
 *         X                     X
 *         X items               X items
 *         X                     X
 *
 *
 * Strategy Six
 * ============
 *
 * Retrieves a parent resource and its named collection with items (sparsely populated), then synchronises the
 * collection items where each item may be updated (its attributes), a new item created or an item removed.
 *
 * This method is used when you have context of one parent and the document collection
 *
 *  @example
 *
 *      parent     resource              document
 *      Resource   Collection            Collection
 *
 *     +----------+
 *     |          |            sync
 *     |          +-----+                +-----+
 *     |     Named|     |  <-----------+ |     |
 *     |          |     |                |     |
 *     |          +-----+                +-----+
 *     |          |   X                     X
 *     |          |   X items               X items
 *     +----------+   X                     X
 *
 *
 *
 * @param resource
 * @param document
 * @param strategies
 * @param options
 */
export async function syncResource<T extends Representation, U extends Document>(
    resource: Tracked<T> | T,
    document: DocumentRepresentation<U> | U,
    strategies: StrategyType[] = [],
    options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions
): Promise<T> {

    const {
        rel = undefined,
        relOnDocument = undefined,
        name = NamedRepresentationFactory.defaultNameStrategy(rel, resource),
        nameOnDocument = NamedRepresentationFactory.defaultNameStrategy(relOnDocument, document),
    } = { ...options };
    // do not pass down
    options = { ...options, rel: undefined, name: undefined, relOnDocument: undefined, nameOnDocument: undefined };

    if (!rel && !relOnDocument && instanceOfSingleton(resource) && instanceOfSingleton(document)) {
        const result = await ApiUtil.get(resource, options);
        if (result) {
            log.debug('sync singleton on rel \'%s\' %s', rel, LinkUtil.getUri(resource, LinkRelation.Self));
            const update = await ApiUtil.update(resource, document as unknown as T, options);
            if (update) {
                await (await SyncUtil.syncResources(resource, document, strategies, options))();
            }
        }
    } else if (!rel && !relOnDocument && instanceOfCollection(resource) && instanceOfDocumentCollection(document)) {

        const { info } = await SyncUtil.synchroniseCollection(resource, document as unknown as CollectionRepresentation, options);
        if (info) {
            // populate the potentially sparse collection - we need to ensure that
            // any existing ones (old) are not stale and that any just created (sparse)
            // are hydrated
            await ApiUtil.get(resource, { ...options, includeItems: true });
            await SyncUtil.tailRecursionThroughStrategies(strategies, info, options);
        }
    } else if (!rel && !relOnDocument && instanceOfCollection(resource) && instanceOfDocumentSingleton(document)) {

        log.debug('collection %s with \'%s\'', LinkUtil.getUri(resource, LinkRelation.Self));

        const result = await ApiUtil.get(resource, options);
        if (instanceOfCollection(result)) {
            const syncInfo = await SyncUtil.syncResourceInCollection(result, document, options);
            if (syncInfo) {
                return await SyncUtil.syncInfos(strategies, options)(syncInfo) as T;
            }
        } else {
            log.error('result is not a collection');
        }
        return result as T;
    } else if (rel && !relOnDocument && instanceOfDocumentCollection(document)) {
        log.debug('collection (in named collection) \'%s\' on %s', name, LinkUtil.getUri(resource, LinkRelation.Self));
        const result = await ApiUtil.get(resource, { ...options, rel });
        if (instanceOfCollection(result)) {
            // in the context of the collection, synchronise the collection part of the document
            await syncResource(result, document, strategies, options);
        } else {
            log.info('No \'%s\' on resource %s', name, LinkUtil.getUri(resource, LinkRelation.Self));
        }
    } else if (rel && !relOnDocument && instanceOfDocumentSingleton(document)) {

        log.debug('resource (named collection) \'%s\' on %s', name, LinkUtil.getUri(resource, LinkRelation.Self));

        const namedResource = await ApiUtil.get(resource, { ...options, rel });
        if (instanceOfCollection(namedResource)) {
            const syncInfo = await SyncUtil.syncResourceInCollection(namedResource, document, options);
            if (syncInfo) {
                return await SyncUtil.syncInfos(strategies, options)(syncInfo) as T;
            }
        }
        return namedResource as unknown as T;
    } else if (rel && relOnDocument) {

        const namedResource = await ApiUtil.get(resource, { ...options, rel });

        if (namedResource) {
            log.debug('resource (named singleton) \'%s\' on %s', name, LinkUtil.getUri(resource, LinkRelation.Self));
            const namedDocument = RepresentationUtil.getProperty(document, nameOnDocument) as DocumentRepresentation<T>;
            const updated = await ApiUtil.update(namedResource as T, namedDocument, options);
            if (updated) {
                await (await SyncUtil.syncResources(updated, namedDocument as T, strategies, options))();
            }
        } else {
            log.debug('no update: singleton \'%s\' not found on %s', name, LinkUtil.getUri(resource, LinkRelation.Self));
        }
    }
    return resource;

}
