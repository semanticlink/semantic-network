import {
    getCollectionInCollection,
    getCollectionInNamedCollection,
    getResource,
    getResourceInCollection,
    getResourceInNamedCollection,
    getSingleton,
} from './syncResource';
import { LinkedRepresentation, LinkType, LinkUtil } from 'semantic-link';
import { instanceOfResourceSync } from '../utils/instanceOf/instanceOfResourceSync';
import { SyncType } from '../interfaces/sync/types';
import { ResourceSync } from '../interfaces/sync/resourceSync';
import { SyncOptions } from '../interfaces/sync/syncOptions';
import { NamedResourceSync } from '../interfaces/sync/namedResourceSync';
import LinkRelConvertUtil from '../utils/linkRelConvertUtil';
import anylogger from 'anylogger';
import RepresentationUtil from '../utils/representationUtil';
import { instanceOfUriList } from '../utils/instanceOf/instanceOfUriList';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';

const log = anylogger('Sync');


/**
 * Retrieves a resource (singleton or collection, either directly or through a link relation) and synchronises from
 * the given document. It then will recurse through all provides `strategies`.
 *
 * @example
 *
 *      ```sync({resource, document})```
 *
 *     Resource               Document
 *
 *                  sync
 *     +-----+                +-----+
 *     |     |  <-----------+ |     |
 *     |     |                |     |
 *     +-----+                +-----+
 *
 * @example
 *
 *  ```sync({resource: collection, document})```
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
 *  @example
 *
 *      ```sync(resource: parentResource, rel, document})```
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
 * @example
 *
 *  ```sync({resource: parentResource, rel, document: parentDocument})
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
 * @example
 *
 *  ```sync({resource: parentResource, rel, document: parentDocument})```
 *
 *     parent      resource             document    parent
 *     Resource    Collection           Collection  Document
 *
 *     +----------+                            +----------+
 *     |          |            sync            |          |
 *     |          +-----+                +-----+          |
 *     |     Named|     |  <-----------+ |     |          |
 *     |          |     |                |     |          |
 *     |          +-----+                +-----+          |
 *     |          |   X                     X  |          |
 *     |          |   X items         items X  |          |
 *     +----------+   X                     X  +----------+
 *
 * @code
 *
 *  Clone a graph of aTenant todo lists
 *
 * Context: (api)-(me)-[tenants]
 * Access: [todos...]-[todos...]-[tags]
 * Pool: (api)-[tags]
 *
 * ```
 *   return sync({
 *      resource: userTenants,
 *      document: aTenant,
 *      strategies: [syncResult => sync({
 *          ...syncResult,
 *          rel: /todos/,
 *          strategies: [syncResult => sync({
 *              ...syncResult,
 *              rel: /todos/,
 *              strategies: [({resource, document, options}) => sync(
 *                  {
 *                      resource,
 *                      rel: /tags/,
 *                      document,
 *                      options: {...options, batchSize: 1}
 *                  }),]
 *          })],
 *      }),
 *      ],
 *      options: {
 *          ...options,
 *          ...pooledTagResourceResolver(apiResource),
 *          resolver: uriMappingResolver
 *      }
 *   );
 * ```
 *
 * @param syncAction
 */
export async function sync<T extends LinkedRepresentation>(syncAction: SyncType<T>): Promise<void> {
    // shared configuration
    const resourceSync: ResourceSync<T> = syncAction;
    const { resource, document, strategies = [], options = <SyncOptions>{} } = resourceSync;

    // resource or collection (directly). This means that no rel is specified
    if (instanceOfResourceSync(syncAction)) {
        if (instanceOfCollection(resource)) {
            if (instanceOfCollection(document)) {
                await getCollectionInCollection(resource, document, strategies, options) as T;
            } else {
                await getResourceInCollection(resource, document, strategies, options);
            }
        } else {
            if (instanceOfCollection(document)) {
                throw new Error('Not Implement: a document collection cannot be synchronised onto a singleton');
            }
            await getResource(resource, document, strategies, options);
        }
        return;
    }

    // resource as named on a resource or collection
    // recast and extract the rel/name values
    const namedCfg = <NamedResourceSync<T>>syncAction;
    const { rel, name = LinkRelConvertUtil.relTypeToCamel(namedCfg.rel) } = namedCfg;

    if (!rel) {
        throw new Error('Sync of a named resource must have a rel specified in the options');
    }

    if (instanceOfUriList(document)) {
        if (strategies) {
            log.warn('Strategies not available for uri-list');
        }
        throw new Error('Not implemented');
    }

    if (!document) {
        log.warn('Matching document does not exist on rel \'%s\' for %s', rel, LinkUtil.getUri(resource as LinkType, 'self'));
        return;
    }

    const collection = RepresentationUtil.getProperty(document, name);
    if (instanceOfCollection(collection)) {
        await getCollectionInNamedCollection(resource, name, rel, collection, strategies, options);
        return;
    }

    instanceOfCollection(resource) ?
        await getResourceInNamedCollection(resource, name, rel, document, strategies, options) :
        await getSingleton(resource, name, rel, document, strategies, options);
}