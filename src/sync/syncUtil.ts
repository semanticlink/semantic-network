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
import { TrackedRepresentation } from '../types/types';
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
            const result = await ApiUtil.delete(deleteResource as TrackedRepresentation<T>, {
                ...options,
                on: collectionResource,
            });
            if (result) {
                const uri = LinkUtil.getUri(deleteResource, LinkRelation.Self);
                if (uri) {
                    resolver.remove(uri);
                }
            }
        };

        /**
         * Update a resource and remember the URI mapping so that if a reference to the
         * network of data resource is required we can resolve a document reference to
         * real resource in our network.
         */
        const updateResourceAndUpdateResolver: UpdateStrategy = async <T extends LinkedRepresentation>(updateResource: T, updateDataDocument: T) => {
            const result = await ApiUtil.get(updateResource as TrackedRepresentation<T>, options);
            if (result) {
                const update = await ApiUtil.update(result, updateDataDocument, options);
                if (update) {
                    const uri = LinkUtil.getUri(updateDataDocument, LinkRelation.Self);
                    const uri1 = LinkUtil.getUri(updateResource, LinkRelation.Self);
                    if (uri && uri1) {
                        resolver.update(uri, uri1);
                    }
                }
            }
        };

        /**
         *
         * @param {*} createDataDocument
         * @return {?LinkedRepresentation} the new resource
         */
        const createResourceAndUpdateResolver: CreateStrategy = async <T extends LinkedRepresentation>(createDataDocument: T) => {

            const result = await ApiUtil.create(createDataDocument, { ...options, on: collectionResource });
            if (result) {
                const uri = LinkUtil.getUri(createDataDocument, LinkRelation.Self);
                const uri1 = LinkUtil.getUri(result, LinkRelation.Self);
                if (uri && uri1) {
                    resolver.add(uri, uri1);
                }
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
                if (uri) {
                    resolver.remove(uri);
                }
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
                log.debug(`[Sync] contribute-only collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
                return {
                    createStrategy: addContributeOnlyResourceAndUpdateResolver,
                    updateStrategy: updateContributeOnlyResourceAndUpdateResolver,
                    deleteStrategy: removeContributeOnlyResourceAndUpdateResolver,
                };

                // If the caller has signalled that the collection is read-only, or the collection
                // if missing a 'create-form' representation then we assume that the NOD can
                // not be changed.
            } else if (readonly || !LinkUtil.matches(collectionResource, /create-form/)) {
                log.debug(`[Sync] read-only collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
                return {
                    createStrategy: createReadonlyResourceAndUpdateResolver,
                    updateStrategy: updateReadonlyResourceAndUpdateResolver,
                    deleteStrategy: deleteReadonlyResourceAndUpdateResolver,
                };

            } else {
                log.debug(`[Sync] updatable collection '${LinkUtil.getUri(collectionResource, LinkRelation.Self)}'`);
                return {
                    createStrategy: createResourceAndUpdateResolver,
                    updateStrategy: updateResourceAndUpdateResolver,
                    deleteStrategy: deleteResourceAndUpdateResolver,
                };
            }
        };

        return await Differencer.difference(collectionResource, collectionDocument, { ...options, ...makeOptions() });
    };

    public static async syncResources<T extends LinkedRepresentation>(
        resource: T,
        document: T,
        strategies: StrategyType[] = [],
        options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<() => Promise<void[]>> {

        return async () => await Promise.all(strategies.map(async (strategy) => strategy({
            resource,
            document,
            options,
        })));
    }

    public static async tailRecursionThroughStrategies(strategies: StrategyType[], syncInfos: SyncInfo[], options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): Promise<void> {
        const { strategyBatchSize = undefined } = { ...options };

        for (const strategy of strategies) {
            if (strategyBatchSize === 0 || !strategyBatchSize) {
                // invoke a parallel strategy when want to go for it
                await Promise.all(syncInfos.map(async syncInfo => {
                    await strategy({
                        resource: syncInfo.resource,
                        document: syncInfo.document,
                        options,
                    });
                }));

            } else {
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
            const result = await ApiUtil.get<CollectionRepresentation<T>, T>(resource, { ...options, where: item });
            if (result) {
                const resource = await ApiUtil.update(result, document, options);
                if (resource) {
                    return {
                        resource: resource,
                        document: document,
                        action: 'update',
                    } as SyncInfo;
                }
            }
        } else {
            // add the document to the collection a
            const result = await ApiUtil.create(document, { ...options, on: resource });
            if (result) {
                const resource = await ApiUtil.get(result, options);
                if (resource) {
                    return {
                        resource: resource,
                        document: document,
                        action: 'create',
                    } as SyncInfo;
                }
            }
        }
    }

    public static syncInfos(strategies: StrategyType[], options?: SyncOptions & ResourceFetchOptions & HttpRequestOptions): (syncInfo: SyncInfo) => Promise<LinkedRepresentation> {
        return async syncInfo => {
            const { strategyBatchSize = undefined } = { ...(options) };

            for (const strategy of strategies) {
                if (strategyBatchSize === 0 || !strategyBatchSize) {
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
