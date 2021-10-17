import { CollectionRepresentation, instanceOfLinkedRepresentation, LinkUtil } from 'semantic-link';
import { assertThat, match } from 'mismatched';
import each from 'jest-each';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { Status } from '../representation/status';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { LinkRelation } from '../linkRelation';

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
                on: undefined,
            }, instanceOfSingleton, Status.locationOnly, true],
            ['sparse, singleton, on (returns undefined)', {
                uri: 'http://example.com/1',
                on: undefined,
            }, instanceOfSingleton, Status.locationOnly, true],
            ['hydrated, singleton', {
                on:  ({ links: [] }),
            } as ResourceFactoryOptions, instanceOfSingleton, Status.hydrated, false],
            ['hydrated, collection', {
                sparseType: 'collection',
                on: ({ links: [], items: [] }),
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


    describe('make, collection items as singletons', () => {

        each([
            ['empty (undefined)', {}, 0],
            ['items, single, uri', { defaultItems: ['//example.com/item/1'] } as ResourceFactoryOptions, 1],
            ['items, two, uri', { defaultItems: ['1', '2'] } as ResourceFactoryOptions, 2],
            ['items, two, uri', { defaultItems: ['1', '2'] } as ResourceFactoryOptions, 2],
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

});


