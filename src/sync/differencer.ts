import anylogger from 'anylogger';
import { CollectionRepresentation, LinkedRepresentation, LinkUtil } from 'semantic-link';
import { LinkRelation } from '../linkRelation';
import { Comparator } from '../interfaces/comparator';
import { SyncOptions } from '../interfaces/sync/syncOptions';
import { CreateType, DeleteType, SyncResultItem, UpdateType } from '../interfaces/sync/types';
import { SyncInfo } from '../interfaces/sync/syncInfo';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import cloneDeep from 'lodash.clonedeep';
import { defaultEqualityOperators } from '../utils/comparators/defaultEqualityOperators';
import { ComparableRepresentation } from '../interfaces/comparableRepresentation';

const log = anylogger('test');

const noopResolver = async () => {
    return undefined;
};
const noopVoidResolver = async () => {
};

// internal data structure
interface MoveType {
    lIndex: number;
    rIndex: number;
    lVal?: LinkedRepresentation;
    rVal?: LinkedRepresentation;
}


export class Differencer {
    /**
     * A default set of comparisons made to check if two resource
     * representation refer to the same resource in a collection.
     *
     * The most specific and robust equality check is first, with the most vague and
     * optimistic last.
     */
    static get defaultEqualityOperators(): Comparator<ComparableRepresentation>[] {
        return defaultEqualityOperators;
    }

    /**
     *  Processes difference sets (create, update, delete) for between two client-side collections {@Link CollectionRepresentation}
     *
     * WARNING: this is a differencing set and update can be misleading. What is means is that we have 'matched' these
     * two resource as both 'existing' and thus may or may not require some form of update on them. The decision on
     * whether there is an actual difference is up to some other decision that know about the internals of the resource
     * (such as an edit form merger).
     *
     *     set one - current collection
     *     set two - new collection

     *     add/create    - not in set one but in set two
     *     match/update  - intersection of both sets (may or may not require a change)
     *     remove/delete - in set one and not in set two
     *
     *                       set one: current
     *                 +-----------------------------+
     *     +-----------------------------------------+
     *     |           |              |              |
     *     |   add     |    match     |   remove     |
     *     |           |              |              |
     *     +-----------------------------------------+
     *     +--------------------------+
     *           set two: new
     *
     *
     * @param  resource an existing resource collection that is
     * synchronised with the server (network of data).
     *
     * @param document a document with a collection CollectionRepresentation
     * format that describes the state of the resources.
     *
     * @param options a document with a collection CollectionRepresentation
     * format that describes the state of the resources.
     */
    static async difference(
        resource: CollectionRepresentation,
        document: CollectionRepresentation,
        options?: SyncOptions): Promise<SyncResultItem> {

        if (!instanceOfCollection(resource)) {
            throw new Error(`[Differencer] collection resource '${LinkUtil.getUri(resource, LinkRelation.Self)}' has no items`);
        }
        if (!instanceOfCollection(document)) {
            throw new Error(`[Differencer] collection document '${LinkUtil.getUri(document, LinkRelation.Self)}' has no items`);
        }

        const {
            createStrategy = noopResolver,
            updateStrategy = noopVoidResolver,
            deleteStrategy = noopResolver,
        } = { ...options } as SyncOptions;

        let {
            comparators = Differencer.defaultEqualityOperators,
        } = { ...options };

        // provide a default comparator and normalise a single comparator to an array of comparators
        if (typeof comparators === 'function') {
            comparators = [comparators];
        }

        /**
         * tuple of collection item and and document item
         */
        const updateItems: UpdateType[] = [];

        // clone the items
        const deleteItems: DeleteType[] = [...resource.items];

        // this needs a deep copy otherwise recursive structures won't work
        // TODO: node17 and later browsers allow 'structuredClone'
        // @see https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
        const createItems = cloneDeep(document.items);

        for (const comparator of comparators) {
            // Get a list of items that need to be updated.
            // create an array of indexes, eg
            // if the first two match return [[0,0]]
            const itemsToMove = deleteItems
                .map((item, index) => {
                    const docIndex = createItems.findIndex(createItem => comparator(item, createItem));
                    return docIndex >= 0 ? { lIndex: index, rIndex: docIndex } : undefined;
                })
                .filter(item => !!item) as MoveType[];

            // Remove those items that are to be updated from the 'delete' list
            // on any that are removed, add reference for later processing onto the pair
            // if there is a match return [0,0,{item}]
            itemsToMove
                .sort((lVal, rVal) => lVal.lIndex - rVal.lIndex)
                .reverse()
                .forEach((pair) => {
                    const index = pair.lIndex;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [representation, _] = deleteItems.splice(index, 1);
                    pair.lVal = representation;
                });

            // Remove those items that are to be updated from the 'create' list
            // on any that are removed, add reference for later processing onto the pair
            itemsToMove
                .sort((lVal, rVal) => lVal.rIndex - rVal.rIndex)
                .reverse()
                .forEach((pair) => {
                    const index = pair.rIndex;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [representation, _] = createItems.splice(index, 1);
                    pair.rVal = representation;
                });

            // Append to the 'update' list the items removed from the 'delete' and 'create' lists
            const argArray = itemsToMove.map(item => ({ lVal: item.lVal, rVal: item.rVal } as UpdateType));

            // TODO: use reduce
            // eslint-disable-next-line prefer-spread
            updateItems.push.apply(updateItems, argArray);
        }

        const { batchSize = undefined } = { ...options };

        //
        // 1. Delete all resource first
        //
        log.debug('delete strategy sequential: count \'%s\'', deleteItems.length);
        for await (const item of deleteItems) {
            await deleteStrategy(item);
        }

        //
        //  2. Then update the existing resources
        //
        if (batchSize === 0 || !batchSize) {
            log.debug('update strategy parallel: count \'%s\'', updateItems.length);
            await Promise.all(updateItems.map(async item => await updateStrategy(item.lVal, item.rVal)));

        } else {
            log.debug('update strategy sequential: count \'%s\'', updateItems.length);
            for await (const item of updateItems) {
                await updateStrategy(item.lVal, item.rVal);
            }
        }

        //
        // 3. Then create the new resources
        //
        let createResults: CreateType[] = [];

        if (batchSize === 0 || !batchSize) {
            log.debug('create strategy parallel: count \'%s\'', createItems.length);
            createResults = await Promise.all(createItems
                .map(async item => {
                    const resource = await createStrategy(item);
                    return { lVal: item, rVal: resource };
                })
            );

        } else {
            log.debug('create strategy sequential: count \'%s\'', createItems.length);
            for await (const item of createItems) {
                const resource = await createStrategy(item);
                createResults.push({ lVal: item, rVal: resource });
            }
        }

        const infos = [
            ...createResults.map(({ lVal, rVal }) => ({
                document: lVal,
                resource: rVal,
                action: 'create',
            } as SyncInfo)),
            ...updateItems.map(({ lVal, rVal }) => ({
                document: lVal,
                resource: rVal,
                action: 'update',
            } as SyncInfo)),
        ];

        log.debug(
            '[add, matched, remove] (%s %s %s) on %s',
            createResults.length,
            updateItems.length,
            deleteItems.length,
            LinkUtil.getUri(resource, LinkRelation.Self)
        );
        return {
            info: infos,
            created: createResults,
            updated: updateItems,
            deleted: deleteItems,
        };
    }
}
