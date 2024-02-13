import {
    CollectionRepresentation,
    instanceOfLinkedRepresentation,
    LinkedRepresentation,
    LinkUtil,
} from 'semantic-link';
import { assertThat, match } from 'mismatched';
import each from 'jest-each';
import {
    pooledCollectionMakeStrategy,
    pooledSingletonMakeStrategy,
    SparseRepresentationFactory,
} from '../representation/sparseRepresentationFactory';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { Status } from '../representation/status';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { LinkRelation } from '../linkRelation';
import { StandardResponseHeader, Tracked } from '../types/types';

describe('Sparse Representation Factory', () => {

    describe('make', () => {
        each([
            ['sparse, singleton, unknown (undefined)', undefined, instanceOfSingleton, Status.virtual, false],
            ['sparse, singleton, unknown (null)', null, instanceOfSingleton, Status.virtual, false],
            ['sparse, singleton, unknown (empty)', {}, instanceOfSingleton, Status.virtual, false],
            ['sparse, singleton, location only (default)', { uri: 'http://example.com/1' }, instanceOfSingleton, Status.locationOnly, true],
            ['sparse, singleton, location only (explicit)', {
                uri: 'http://example.com/1',
                sparseType: 'singleton',
            }, instanceOfSingleton, Status.locationOnly, true],
            ['sparse, collection, location only', {
                uri: 'http://example.com/1',
                sparseType: 'collection',
            }, instanceOfCollection, Status.locationOnly, true],
            ['sparse, singleton, on (undefined)', {
                uri: 'http://example.com/1',
                addStateOn: undefined,
            }, instanceOfSingleton, Status.locationOnly, true],
            ['sparse, singleton, on (returns undefined)', {
                uri: 'http://example.com/1',
                addStateOn: undefined,
            }, instanceOfSingleton, Status.locationOnly, true],
            ['hydrated, singleton', {
                addStateOn: ({ links: [] }),
            } as ResourceFactoryOptions, instanceOfSingleton, Status.hydrated, false],
            ['hydrated, singleton with eTag', {
                eTag: '34c6',
                addStateOn: ({ links: [] }),
            } as ResourceFactoryOptions, instanceOfSingleton, Status.hydrated, false],
            ['hydrated, collection', {
                sparseType: 'collection',
                eTag: '34c6',
                addStateOn: ({ links: [], items: [] }),
            } as ResourceFactoryOptions, instanceOfCollection, Status.hydrated, false],
        ])
            .describe(
                '%s',
                (title: string, options: ResourceFactoryOptions, instanceOfType: (v: unknown) => boolean, status: Status, matchesSelf: boolean) => {

                    const resource = SparseRepresentationFactory.make(options);

                    it('should be defined as linkedRepresentation', () => {
                        assertThat(resource).is(match.predicate(instanceOfLinkedRepresentation));
                    });

                    it('should be of type', () => {
                        assertThat(resource).is(match.predicate(instanceOfType));
                    });

                    it('should have Self link', () => {
                        assertThat(LinkUtil.matches(resource, LinkRelation.Self)).is(matchesSelf);
                    });

                    it('has status', () => {
                        assertThat(TrackedRepresentationUtil.getState(resource).status).is(status);
                    });

                });
    });

    describe('make, singleton with attributes', () => {
        each([
            ['empty (undefined)', {}, 0],
            ['items, single, uri', { defaultItems: ['//example.com/item/1'] } as ResourceFactoryOptions, 1],
            ['items, two, uri', { defaultItems: ['1', '2'] } as ResourceFactoryOptions, 2],
            ['items, two, uri', { defaultItems: ['1', '2'] } as ResourceFactoryOptions, 2],
            ['items, one, feed no title', { defaultItems: [{ id: '1', title: '' }] } as ResourceFactoryOptions, 1],
            ['items, one, feed title', { defaultItems: [{ id: '1', title: 't' }] } as ResourceFactoryOptions, 1],
            ['items, one, feed eTag', { defaultItems: [{ id: '1', eTag: '34vg' }] } as ResourceFactoryOptions, 1],
            ['items, one, feed lastModified', {
                defaultItems: [{
                    id: '1',
                    lastModified: '34vg',
                }],
            } as ResourceFactoryOptions, 1],
        ])
            .describe(
                '%s',
                (title: string, options: ResourceFactoryOptions, count: number) => {
                    options = { sparseType: 'collection', ...options };
                    const resource = SparseRepresentationFactory.make<CollectionRepresentation>(options);

                    it('should be of type', () => {
                        assertThat(resource).is(match.predicate(instanceOfCollection));
                    });

                    it('has items', () => {
                        expect(resource.items).toBeDefined();
                    });

                    it('has items of count', () => {
                        expect(resource.items.length).toBe(count);
                    });

                    it('any items are singletons', () => {
                        for (const item of resource.items) {
                            assertThat(item).is(match.predicate(instanceOfSingleton));
                        }
                    });
                });
    });

    describe('make, collection items as singletons', () => {
        each([
            ['items, one, feed', {
                defaultItems: [{
                    id: '1',
                    title: 'X',
                    lastModified: '2023-01-31T18:15:33.082549Z',
                    eTag: '45cg',
                }],
            } as ResourceFactoryOptions],
        ])
            .describe(
                '%s',
                (title: string, options: ResourceFactoryOptions) => {
                    options = { sparseType: 'collection', ...options };
                    const resource = SparseRepresentationFactory.make<CollectionRepresentation>(options) as Tracked<CollectionRepresentation<LinkedRepresentation & {
                        name: string,
                        updatedAt: string
                    }>>;

                    it('the item is a singleton', () => {
                        assertThat(resource.items[0]).is(match.predicate(instanceOfSingleton));
                    });
                    it('the item has property updatedAt (default mapping)', () => {
                        assertThat(resource.items[0].updatedAt).is('2023-01-31T18:15:33.082549Z');
                    });

                    it('the item has property name (default mapping)', () => {
                        assertThat(resource.items[0].name).is('X');
                    });
                    it('the item has header etag (default mapping)', () => {
                        const item = resource.items[0] as unknown as Tracked;
                        const { headers: { etag: eTag = undefined } } = TrackedRepresentationUtil.getState(item);
                        assertThat(eTag).is('45cg');
                    });
                });
    });


    describe('make, pooled collection items as collections', () => {
        each([
            [
                'empty (undefined)',
                { addStateOn: { links: [], items: [] } },
                { addStateOn: { links: [], items: [] } },
                0,
                0,
            ],

            [
                'A collection with one item, where that item is already in the pool',
                { addStateOn: { links: [], items: [{ id: '//example.com/item/1' }] } },
                { addStateOn: { links: [], items: [{ id: '//example.com/item/1', title: 'Pool item #1' }] } },
                1,
                1,
            ],

            [
                'A collection with one item, where that item is **not** in the pool',
                { addStateOn: { links: [], items: [{ id: '//example.com/item/99' }] } },
                { addStateOn: { links: [], items: [{ id: '//example.com/item/1', title: 'Pool item #1' }] } },
                1,
                2,
            ],

        ])
            .describe(
                '%s',
                (
                    title: string,
                    options: ResourceFactoryOptions,
                    poolOptions: ResourceFactoryOptions,
                    count: number,
                    poolItemCount: number) => {
                    const pool = SparseRepresentationFactory.make<CollectionRepresentation>(poolOptions);

                    // Make a collection resource by populating the members using a pool collection
                    const resource = SparseRepresentationFactory.make<CollectionRepresentation>({
                        sparseType: 'collection',
                        makeSparseStrategy: (options) => pooledCollectionMakeStrategy<LinkedRepresentation>(pool, options),
                        ...options,
                    });

                    it('should be of type', () => {
                        assertThat(resource).is(match.predicate(instanceOfCollection));
                    });

                    it('has items', () => {
                        expect(resource.items).toBeDefined();
                    });

                    it('has items of count', () => {
                        expect(resource.items.length).toBe(count);
                    });

                    it('any items are singletons', () => {
                        for (const item of resource.items) {
                            assertThat(item).is(match.predicate(instanceOfSingleton));
                        }
                    });

                    it('pool has items of count', () => {
                        expect(pool.items.length).toBe(poolItemCount);
                    });

                    it('any pool items are singletons', () => {
                        for (const item of pool.items) {
                            assertThat(item).is(match.predicate(instanceOfSingleton));
                        }
                    });
                });
    });


    describe('make, pooled collection items as singleton', () => {
        each([
            [
                'empty sparse (undefined)',
                { uri: undefined },
                { addStateOn: { links: [], items: [] } },
                0,
            ],

            [
                'empty hydrated (undefined)',
                { addStateOn: { links: [{ rel: 'self', href: '//example.com/item/1' }] } },
                { addStateOn: { links: [], items: [] } },
                1,
            ],

            [
                'A sparse item, where that item is already in the pool',
                { uri: '//example.com/item/1' },
                { addStateOn: { links: [], items: [{ id: '//example.com/item/1', title: 'Pool item #1' }] } },
                1,
            ],

            [
                'An sparse item, where that item is **not** in the pool',
                { uri: '//example.com/item/99' },
                { addStateOn: { links: [], items: [{ id: '//example.com/item/1', title: 'Pool item #1' }] } },
                2,
            ],

            [
                'A hydrated item, where that item is already in the pool',
                { addStateOn: { links: [{ rel: 'self', href: '//example.com/item/1' }] } },
                { addStateOn: { links: [], items: [{ id: '//example.com/item/1', title: 'Pool item #1' }] } },
                1,
            ],

            [
                'An hydrated item, where that item is **not** in the pool',
                { addStateOn: { links: [{ rel: 'self', href: '//example.com/item/99' }] } },
                { addStateOn: { links: [], items: [{ id: '//example.com/item/1', title: 'Pool item #1' }] } },
                2,
            ],

        ])
            .describe(
                '%s',
                (
                    title: string,
                    options: ResourceFactoryOptions,
                    poolOptions: ResourceFactoryOptions,
                    poolItemCount: number) => {
                    const pool = SparseRepresentationFactory.make<CollectionRepresentation>(poolOptions);

                    // Make a collection resource by populating the members using a pool collection
                    const resource = SparseRepresentationFactory.make<CollectionRepresentation>({
                        sparseType: 'singleton',
                        makeSparseStrategy: (options) => pooledSingletonMakeStrategy<LinkedRepresentation>(pool, options),
                        ...options,
                    });

                    it('should be of type', () => {
                        assertThat(resource).is(match.predicate(instanceOfSingleton));
                    });

                    it('has items', () => {
                        expect(resource.items).not.toBeDefined();
                    });

                    it('pool has items of count', () => {
                        expect(pool.items.length).toBe(poolItemCount);
                    });

                    it('any pool items are singletons', () => {
                        for (const item of pool.items) {
                            assertThat(item).is(match.predicate(instanceOfSingleton));
                        }
                    });
                });
    });

    describe('make, pooled collection items as singleton with eTags, checks for stale', () => {
        each([


            [
                'empty hydrated (undefined) with no eTag',
                { addStateOn: { links: [{ rel: 'self', href: '//example.com/item/1' }] } },
                { addStateOn: { links: [], items: [] } },
                1,
                Status.hydrated,
                undefined,
            ],

            [
                'empty hydrated (undefined) with eTag',
                { addStateOn: { links: [{ rel: 'self', href: '//example.com/item/1' }] }, eTag: '"hash1"' },
                { addStateOn: { links: [], items: [] } },
                1,
                Status.hydrated,
                { etag: '"hash1"' },
            ],

            [
                'empty hydrated (undefined) with weak eTag',
                { addStateOn: { links: [{ rel: 'self', href: '//example.com/item/1' }] }, eTag: 'W/\"hash1\"' },
                { addStateOn: { links: [], items: [] } },
                1,
                Status.hydrated,
                { etag: 'W/\"hash1\"' },
            ],


            [
                'A sparse item, where that item is already in the pool, no eTag',
                { uri: '//example.com/item/1' },
                {
                    addStateOn: {
                        links: [],
                        items: [{ id: '//example.com/item/1', title: 'Pool item #1', eTag: '"hash1"' }],
                    },
                },
                1,
                Status.locationOnly,
                { etag: '"hash1"' },
            ],


            [
                'An sparse item, where that item is **not** in the pool, adds second ready to load',
                { uri: '//example.com/item/99', eTag: '"hash99"' },
                {
                    addStateOn: {
                        links: [],
                        items: [{ id: '//example.com/item/1', title: 'Pool item #1', eTag: '"hash1"' }],
                    },
                },
                2,
                Status.locationOnly,
                { etag: '"hash1"' },
            ],

            [
                'A hydrated item, where that item is already in the pool',
                {
                    addStateOn: { links: [{ rel: 'self', href: '//example.com/item/1' }] },
                    eTag: '"hash-updated-ready-for-pool"',
                },
                {
                    addStateOn: {
                        links: [],
                        items: [{ id: '//example.com/item/1', title: 'Pool item #1', eTag: '"hash-pooled-1"' }],
                    },
                },
                1,
                Status.stale,
                { etag: '"hash-pooled-1"' },
            ],

            [
                'A hydrated item, where that item is already in the pool, same eTags',
                { addStateOn: { links: [{ rel: 'self', href: '//example.com/item/1' }] }, eTag: '"hash1"' },
                {
                    addStateOn: {
                        links: [],
                        items: [{ id: '//example.com/item/1', title: 'Pool item #1', eTag: '"hash1"' }],
                    },
                },
                1,
                Status.locationOnly,
                { etag: '"hash1"' },
            ],


        ])
            .describe(
                '%s',
                (
                    title: string,
                    options: ResourceFactoryOptions,
                    poolOptions: ResourceFactoryOptions,
                    poolItemCount: number,
                    itemAtIndexStatus: Status,
                    headers: Record<StandardResponseHeader | string, string>) => {

                    const pool = SparseRepresentationFactory.make<CollectionRepresentation>(poolOptions);

                    // Make a collection resource by populating the members using a pool collection
                    const resource = SparseRepresentationFactory.make<CollectionRepresentation>({
                        sparseType: 'singleton',
                        makeSparseStrategy: (options) => pooledSingletonMakeStrategy<LinkedRepresentation>(pool, options),
                        ...options,
                    });

                    it('should be of type', () => {
                        assertThat(resource).is(match.predicate(instanceOfSingleton));
                    });

                    it('has items', () => {
                        expect(resource.items).not.toBeDefined();
                    });

                    it('pool has items of count', () => {
                        expect(pool.items.length).toBe(poolItemCount);
                    });

                    it('pool item has state', () => {
                        // always check the last index (count-1)
                        const { status } = TrackedRepresentationUtil.getState(pool.items[poolItemCount - 1] as Tracked);
                        expect(status).toBe(itemAtIndexStatus);
                    });

                    it('pool first item has header eTag', () => {
                        // always check the last index (count-1)
                        const { headers: { etag } } = TrackedRepresentationUtil.getState(pool.items[poolItemCount - 1] as Tracked);
                        expect((etag ? { etag } : undefined)).toStrictEqual(headers);
                    });

                    it('any pool items are singletons', () => {
                        for (const item of pool.items) {
                            assertThat(item).is(match.predicate(instanceOfSingleton));
                        }
                    });
                });
    });

});


