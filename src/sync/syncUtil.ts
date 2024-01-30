import { CollectionRepresentation, LinkedRepresentation, LinkUtil } from 'semantic-link';
import { StrategyType, SyncResultItem } from '../interfaces/sync/types';
import { SyncOptions } from '../interfaces/sync/syncOptions';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { SyncInfo } from '../interfaces/sync/syncInfo';
import { DocumentRepresentation } from '../interfaces/document';
import { ApiUtil } from '../apiUtil';
import { noopResolver } from '../representation/resourceMergeFactory';
import {
    CreateStrategy,
    DeleteStrategy,
    SyncResolverOptions,
    UpdateStrategy,
} from '../interfaces/sync/syncResolverOptions';
import { Document, Representation, Tracked } from '../types/types';
import { LinkRelation } from '../linkRelation';
import { Differencer } from './differencer';
import anylogger from 'anylogger';
import { RepresentationUtil } from '../utils/representationUtil';

const log = anylogger('SyncUtil');

export class SyncUtil {

    public static defaultFindResourceInCollectionStrategy = RepresentationUtil.findInCollection;

    public static synchroniseCollection = async function <T extends LinkedRepresentation>(
        collectionResource: CollectionRepresentation<T>,
        collectionDocument: CollectionRepresentation<T>,
        options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<SyncResultItem> {

        const {
            resolver = noopResolver,
            readonly,
            contributeonly,
        } = { ...options };

        /**
         * Delete a resource from the local state cache
         */
        const deleteResourceAndUpdateResolver: DeleteStrategy = async <T extends LinkedRepresentation>(deleteResource: T) => {
            const result = await ApiUtil.delete(deleteResource as Tracked<T>, {
                ...options,
                // TODO: this is unlikely to be used 'on' doesn't exist in delete
                addStateOn: collectionResource,
            });
            if (result) {
                const uri = LinkUtil.getUri(deleteResource, LinkRelation.Self);
                if (uri) {
                    log.debug('sync delete on collection \'%s\' %s', LinkUtil.getUri(collectionResource, LinkRelation.Self), uri);
                    resolver.remove(uri);
                }
            } else {
                log.debug(
                    'sync not deleted on collection \'%s\' %s',
                    LinkUtil.getUri(collectionResource, LinkRelation.Self),
                    LinkUtil.getUri(deleteResource, LinkRelation.Self));
            }
        };

        /**
         * Update a resource and remember the URI mapping so that if a reference to the
         * network of data resource is required we can resolve a document reference to
         * real resource in our network.
         */
        const updateResourceAndUpdateResolver: UpdateStrategy = async <T extends LinkedRepresentation>(updateResource: T, updateDataDocument: T) => {
            const result = await ApiUtil.get(updateResource, options) as T;
            if (result) {
                const update = await ApiUtil.update(result, updateDataDocument, options);
                if (update) {
                    const uriOriginal = LinkUtil.getUri(updateDataDocument, LinkRelation.Self);
                    const uriResult = LinkUtil.getUri(updateResource, LinkRelation.Self);
                    if (uriOriginal && uriResult) {
                        log.debug('sync update on \'%s\' %s --> %s', LinkUtil.getUri(update, LinkRelation.Self), uriOriginal, uriResult);
                        resolver.update(uriOriginal, uriResult);
                    }
                }
            } else {
                log.warn('sync not updated on %s', LinkUtil.getUri(updateResource, LinkRelation.Self));
            }
        };

        /**
         *
         * @param {*} createDataDocument
         * @return {?LinkedRepresentation} the new resource
         */
        const createResourceAndUpdateResolver: CreateStrategy = async <T extends LinkedRepresentation>(createDataDocument: T) => {

            const result = await ApiUtil.create(createDataDocument, { ...options, createContext: collectionResource });
            const uriOriginal = LinkUtil.getUri(createDataDocument, LinkRelation.Self);
            if (result) {
                const uriResult = LinkUtil.getUri(result, LinkRelation.Self);
                if (uriOriginal && uriResult) {
                    log.debug('sync create on collection \'%s\' %s --> %s', LinkUtil.getUri(collectionResource, LinkRelation.Self), uriOriginal, uriResult);
                    resolver.add(uriOriginal, uriResult);
                }
            } else {
                log.warn('sync on collection not created \'%s\' for %s', LinkUtil.getUri(collectionResource, LinkRelation.Self), uriOriginal);
            }
            // TODO: returning undefined changes the interface T | undefined on the CreateStrategy
            return result as unknown as T;
        };

        /**
         * A read-only collection needs have an item deleted. We don't delete it
         * but can add it to our mapping resolver anyway.
         *
         * We don't expect to come in here but we will if the document supplied
         * has less items that the current network of data (likely from time to time).
         */
        const deleteReadonlyResourceAndUpdateResolver: DeleteStrategy = async <T extends LinkedRepresentation>(collectionResourceItem: T) => {
            const uri = LinkUtil.getUri(collectionResourceItem, LinkRelation.Self);
            if (uri) {
                log.debug('sync remove %s', uri);
                resolver.remove(uri);
            }
        };

        /**
         * Don't make request back to update, just remember the URI mapping so that if a reference to the
         * network of data resource is required we can resolve a document reference to the real resource in
         * our network.
         */
        const updateReadonlyResourceAndUpdateResolver: UpdateStrategy = async <T extends LinkedRepresentation>(collectionResourceItem: T, updateDataDocument: T) => {
            const uri = LinkUtil.getUri(updateDataDocument, LinkRelation.Self);
            const uri1 = LinkUtil.getUri(collectionResourceItem, LinkRelation.Self);
            if (uri && uri1) {
                resolver.update(uri, uri1);
            }
        };

        /**
         * A read-only collection is missing a URI. This is likely to cause problems because
         * the URI will not be resolvable, because no matching resource can be found.
         */
        const createReadonlyResourceAndUpdateResolver: CreateStrategy = async <T>() => {
            // TODO: update interface
            return undefined as unknown as T;
        };

        /**
         * A contribute-only collection needs have an item removed. We send a DELETE request
         * back to the server on the collection URI with a payload containing the URI of the
         * removed item
         */
        const removeContributeOnlyResourceAndUpdateResolver: DeleteStrategy = async <T extends LinkedRepresentation>(deleteResource: T) => {
            const result = await ApiUtil.delete(collectionResource, { ...options, where: deleteResource });
            if (result) {
                const uri = LinkUtil.getUri(deleteResource, LinkRelation.Self);
                log.debug('sync on collection delete \'%s\' %s', LinkUtil.getUri(collectionResource, LinkRelation.Self), uri);
                if (uri) {
                    resolver.remove(uri);
                }
            } else {
                log.debug('sync delete \'%s\' %s', LinkUtil.getUri(deleteResource, LinkRelation.Self));
            }
        };

        /**
         * Don't make request back to update, just remember the URI mapping so that if a reference to the
         * network of data resource is required we can resolve a document reference to the real resource in
         * our network.
         */
        const updateContributeOnlyResourceAndUpdateResolver: UpdateStrategy = async <T extends LinkedRepresentation>(collectionResourceItem: T, updateDataDocument: T) => {
            // at this point, it is the same implementation as the read-only form
            return await updateReadonlyResourceAndUpdateResolver(collectionResourceItem, updateDataDocument);
        };

        /**
         * A contribute-only collection is missing a URI. This is likely to cause problems because
         * the URI will not be resolvable, because no matching resource can be found. It will then attempt to
         * add the item to the collection
         */
        const addContributeOnlyResourceAndUpdateResolver: CreateStrategy = async <T extends LinkedRepresentation>(createDataDocument: T) => {
            return await createResourceAndUpdateResolver(createDataDocument);
        };

        const makeOptions = (): SyncResolverOptions => {
            if (contributeonly) {
                log.debug(`contribute-only collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
                return {
                    createStrategy: addContributeOnlyResourceAndUpdateResolver,
                    updateStrategy: updateContributeOnlyResourceAndUpdateResolver,
                    deleteStrategy: removeContributeOnlyResourceAndUpdateResolver,
                };

                // If the caller has signalled that the collection is read-only, or the collection
                // if missing a 'create-form' representation then we assume that the NOD can
                // not be changed.
            } else if (readonly || !LinkUtil.matches(collectionResource, LinkRelation.CreateForm)) {
                log.debug(`read-only collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
                return {
                    createStrategy: createReadonlyResourceAndUpdateResolver,
                    updateStrategy: updateReadonlyResourceAndUpdateResolver,
                    deleteStrategy: deleteReadonlyResourceAndUpdateResolver,
                };

            } else {
                log.debug(`updatable collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
                return {
                    createStrategy: createResourceAndUpdateResolver,
                    updateStrategy: updateResourceAndUpdateResolver,
                    deleteStrategy: deleteResourceAndUpdateResolver,
                };
            }
        };

        return await Differencer.difference(collectionResource, collectionDocument, { ...options, ...makeOptions() });
    };

    public static async syncResources<T extends Representation, U extends Document>(
        resource: T,
        document: U,
        strategies: StrategyType[] = [],
        options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<() => Promise<void[]>> {

        log.debug('sync strategy resource: parallel');
        return async () => await Promise.all(strategies.map(async (strategy) => strategy({
            resource,
            document,
            options,
        })));
    }

    public static async tailRecursionThroughStrategies(
        strategies: StrategyType[],
        syncInfos: SyncInfo[],
        options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<void> {

        const { strategyBatchSize = undefined } = { ...options };

        for (const strategy of strategies) {
            if (strategyBatchSize === 0 || !strategyBatchSize) {
                // invoke a parallel strategy when want to go for it
                log.debug('sync strategy tail: parallel');
                await Promise.all(syncInfos.map(async syncInfo => {
                    await strategy({
                        resource: syncInfo.resource,
                        document: syncInfo.document,
                        options,
                    });
                }));

            } else {
                log.debug('sync strategy tail: sequential ');
                // invoke a sequential strategy - and for now, single at a time
                for (const syncInfo of syncInfos) {
                    await strategy({
                        resource: syncInfo.resource,
                        document: syncInfo.document,
                        options,
                    });
                }
            }
        }
    }

    public static async syncResourceInCollection<T extends LinkedRepresentation>(
        resource: CollectionRepresentation<T>,
        document: T | DocumentRepresentation<T>,
        options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<SyncInfo | undefined> {

        const {
            findResourceInCollectionStrategy = this.defaultFindResourceInCollectionStrategy,
            forceCreate = false,
        } = { ...options };

        // locate the document in the collection items
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore not sure why this typing isn't working
        const item = findResourceInCollectionStrategy(resource, { where: document });

        // check whether to update or create
        if (item && !forceCreate) {
            // synchronise the item in the collection from the server
            const result = await ApiUtil.get(resource, { ...options, where: item }) as T;
            if (result) {
                const resource = await ApiUtil.update(result, document, options);
                if (resource) {
                    log.debug('sync resource \'update\' in collection %s', LinkUtil.getUri(resource, LinkRelation.Self));
                    return {
                        resource: resource,
                        document: document,
                        action: 'update',
                    } as SyncInfo;
                } else {
                    log.warn('sync resource \'update\' failed in collection %s', LinkUtil.getUri(resource, LinkRelation.Self));
                }
            }
        } else {
            // add the document to the collection a
            const result = await ApiUtil.create(document, { ...options, createContext: resource });
            if (result) {
                if (result) {
                    log.debug('sync resource \'create\' in collection %s', LinkUtil.getUri(result, LinkRelation.Self));
                    return {
                        resource: result,
                        document: document,
                        action: 'create',
                    } as SyncInfo;
                }
            } else {
                log.warn('sync resource \'create\' failed in collection %s', LinkUtil.getUri(resource, LinkRelation.Self));
            }
        }
    }

    public static syncInfos(strategies: StrategyType[], options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): (syncInfo: SyncInfo) => Promise<LinkedRepresentation> {
        return async syncInfo => {
            const { strategyBatchSize = undefined } = { ...(options) };

            for (const strategy of strategies) {
                if (strategyBatchSize === 0 || !strategyBatchSize) {

                    log.debug('sync strategy info: parallel');
                    // invoke a parallel strategy when want to go for it
                    await Promise.all([syncInfo].map(async syncInfo => {
                        await strategy({
                            resource: syncInfo.resource,
                            document: syncInfo.document,
                            options,
                        });
                    }));

                } else {
                    // invoke a sequential strategy - and for now, single at a time
                    log.debug('sync strategy info: sequential');
                    for (const syncInfo1 of [syncInfo]) {
                        await strategy({
                            resource: syncInfo1.resource,
                            document: syncInfo1.document,
                            options,
                        });
                    }
                }
            }
            return syncInfo.resource;
        };
    }
}
