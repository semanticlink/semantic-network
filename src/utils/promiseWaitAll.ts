import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';

/**
 * Resolution of promises across a collection. Returns when all resolutions have occurred.
 *
 * @param resource collection to iterate through all the items
 * @param iterator promise-based iterator
 */
export type PromiseWaitAll = <T extends CollectionRepresentation<U>, U extends LinkedRepresentation>(
    resource: T,
    iterator: (item: U) => Promise<void>) => Promise<void>;

/**
 * Resolution of promises across a map. Returns when all resolutions have occurred.
 *
 * @param resource collection to iterate through all the items
 * @param iterator promise-based iterator
 * @returns the array of mapped representations that have been iterated across
 */
export type PromiseMapWaitAll = <T extends CollectionRepresentation<U>, U extends LinkedRepresentation, TMap extends unknown>(
    resource: T,
    iterator: (item: U) => Promise<TMap>) => Promise<TMap[]>;


/**
 * Sequential resolution of promises across a collection. Returns when all resolutions have occurred.
 *
 * @param resource collection to iterate through all the items
 * @param iterator promise-based iterator
 * @returns the array of mapped representations that have been iterated across
 * @see parallelMapWaitAll
 */
export const sequentialMapWaitAll: PromiseMapWaitAll = async <T extends CollectionRepresentation<U>, U extends LinkedRepresentation, TMap extends unknown>(
    resource: T,
    iterator: (item: U) => Promise<TMap>): Promise<TMap[]> => {

    const arr = [];
    for (const item of resource.items) {
        arr.push(await iterator(item));
    }
    return arr;
};

/**
 * Parallel resolution of promises across a collection. Returns when all resolutions have occurred.
 *
 * @param resource collection to iterate through all the items
 * @param iterator promise-based iterator
 * @returns the array of mapped representations that have been iterated across
 * @see sequentialMapWaitAll
 */
export const parallelMapWaitAll: PromiseMapWaitAll = async <T extends CollectionRepresentation<U>, U extends LinkedRepresentation, TMap extends unknown>(
    resource: T,
    iterator: (item: U) => Promise<TMap>): Promise<TMap[]> => {

    return await Promise.all(resource.items.map(async item => await iterator(item)));
};

/**
 * Sequential resolution of promises across a collection. Returns when all resolutions have occurred.
 *
 * @param resource collection to iterate through all the items
 * @param iterator promise-based iterator
 * @see parallelWaitAll
 */
export const sequentialWaitAll: PromiseWaitAll = async <T extends CollectionRepresentation<U>, U extends LinkedRepresentation>(
    resource: T,
    iterator: (item: U) => Promise<void>): Promise<void> => {
    await sequentialMapWaitAll(resource, iterator);
};

/**
 * Parallel resolution of promises across a collection. Returns when all resolutions have occurred.
 *
 * @param resource collection to iterate through all the items
 * @param iterator promise-based iterator
 * @see sequentialWaitAll
 */
export const parallelWaitAll: PromiseWaitAll = async <T extends CollectionRepresentation<U>, U extends LinkedRepresentation>(
    resource: T,
    iterator: (item: U) => Promise<void>) => {
    await parallelMapWaitAll(resource, iterator);
};
