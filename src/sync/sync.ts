import { LinkType, LinkUtil } from 'semantic-link';
import { ResourceSync } from '../interfaces/sync/resourceSync';
import { SyncOptions } from '../interfaces/sync/syncOptions';
import { instanceOfResourceSync } from '../utils/instanceOf/instanceOfResourceSync';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { syncResource } from './syncResource';
import { LinkRelConvertUtil } from '../utils/linkRelConvertUtil';
import { instanceOfUriList } from '../utils/instanceOf/instanceOfUriList';
import { RepresentationUtil } from '../utils/representationUtil';
import anylogger from 'anylogger';
import { Document, Representation } from '../types/types';
import { LinkRelation } from '../linkRelation';

const log = anylogger('sync');

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
 *
 * @param syncAction
 */
export async function sync<T extends Representation = Representation, U extends Document = Document>(syncAction: ResourceSync<T, U>): Promise<void> {
    // shared configuration
    const { resource, document, strategies = [], options = <SyncOptions>{}, rel } = syncAction;

    const uri = LinkUtil.getUri(resource, LinkRelation.Self);
    log.debug('sync: start [\'%s\']', uri);

    // resource or collection (directly). This means that no rel is specified
    if (instanceOfResourceSync(syncAction)) {
        if (instanceOfCollection(resource)) {
            log.debug('sync: on collection');
            await syncResource(resource, document, strategies, options);
        } else {
            if (instanceOfCollection(document)) {
                throw new Error('Not Implemented: a document collection cannot be synchronised onto a singleton');
            }
            log.debug('sync: on singleton');
            await syncResource(resource, document, strategies, options);
        }
    } else {
        // resource as named on a resource or collection
        // recast and extract the rel/name values
        const { name = LinkRelConvertUtil.relTypeToCamel(rel) } = syncAction;

        if (!rel) {
            throw new Error('Sync of a named resource must have a rel specified in the options');
        }

        if (instanceOfUriList(document)) {
            if (strategies) {
                log.warn('Strategies not available for uri-list');
            }
            throw new Error('Not implemented');
        }

        if (document) {
            const namedDocument = RepresentationUtil.getProperty(document, name);
            if (namedDocument) {
                if (instanceOfCollection(namedDocument)) {
                    log.debug('sync: named document collection [\'%s\' with rel \'%s\']', name, rel);
                    await syncResource(resource, namedDocument as unknown as T, strategies, { ...options, rel });
                } else {
                    if (instanceOfCollection(resource)) {
                        log.debug('sync: collection [\'%s\' with rel \'%s\']', name, rel);
                        await syncResource(resource, document, strategies, { ...options, rel });
                    } else {
                        log.debug('sync: named singleton [\'%s\' with rel \'%s\']', name, rel);
                        await syncResource(resource, document, strategies, { ...options, rel, relOnDocument: rel });
                    }
                }
            } else {
                log.debug('sync: named document not found');
            }
        } else {
            log.warn('sync: matching document does not exist on rel \'%s\' for %s', rel, LinkUtil.getUri(resource as LinkType, 'self'));
        }
    }

    log.debug('sync: end [\'%s\']', uri);
}
