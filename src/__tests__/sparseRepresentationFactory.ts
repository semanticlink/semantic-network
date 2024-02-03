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
import { Tracked } from '../types/types';

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
            ['hydrated, collection', {
                sparseType: 'collection',
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
            ['items, one, feed', { defaultItems: [{ id: '1', title: '' }] } as ResourceFactoryOptions, 1],
            ['items, one, feed', { defaultItems: [{ id: '1', title: '' }] } as ResourceFactoryOptions, 1],
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
                }],
            } as ResourceFactoryOptions, 1],
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
                    it('the item has property updatedAt', () => {
                        assertThat(resource.items[0].updatedAt).is('2023-01-31T18:15:33.082549Z');
                    });

                    it('the item has property name', () => {
                        assertThat(resource.items[0].name).is('X');
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

});


