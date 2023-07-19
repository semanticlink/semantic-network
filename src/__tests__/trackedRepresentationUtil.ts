import {TrackedRepresentationUtil} from '../utils/trackedRepresentationUtil';
import {CollectionRepresentation, LinkedRepresentation} from 'semantic-link';
import {Status} from '../representation/status';
import {SparseRepresentationFactory} from '../representation/sparseRepresentationFactory';
import {Tracked} from '../types/types';
import {instanceOfCollection} from '../utils/instanceOf/instanceOfCollection';
import {instanceOfTrackedRepresentation} from '../utils/instanceOf/instanceOfTrackedRepresentation';
import { SingletonMerger } from '../representation/singletonMerger';

type T = Tracked<LinkedRepresentation> & { me: LinkedRepresentation } & { users: CollectionRepresentation };
const makeRoot = () => SparseRepresentationFactory.make({uri: 'https://example.com'}) as T;
const makeMe = () => SparseRepresentationFactory.make(
    {uri: 'https://example.com/me'}) as Tracked<LinkedRepresentation>;
const makeUsersCollection = () => SparseRepresentationFactory.make(
    {uri: 'https://example.com/users', sparseType: 'collection'}) as Tracked<LinkedRepresentation>;


describe('Tracked Representation Utils', () => {

    describe('location only', function() {
        type T = Tracked<LinkedRepresentation> & { test: string };
        type K = keyof T;
        const resource = SparseRepresentationFactory.make({uri: 'https://example.com/1'}) as T;

        it('getState, should be defined', () => {
            expect(resource).not.toBeNull();
            expect(TrackedRepresentationUtil.getState(resource).status).toBe(Status.locationOnly);
        });

        it('getState, should be location only', () => {
            expect(TrackedRepresentationUtil.getState(resource).status).toBe(Status.locationOnly);
        });

        it('isTracked, should not be tracked', () => {
            // note typings above specify the 'test' field
            expect(TrackedRepresentationUtil.isTracked<T, K>(resource, 'test')).toBeFalsy();
            expect(TrackedRepresentationUtil.isTracked(resource, 'test')).toBeFalsy();
        });

        it('needsFetchFromState, should need fetch', () => {
            expect(TrackedRepresentationUtil.needsFetchFromState(resource)).toBeTruthy();
        });
    });

    describe('collection', () => {

        it('should not be a collection', () => {
            expect(instanceOfCollection({})).toBeFalsy();
        });

        it('should be a collection', () => {
            const object: CollectionRepresentation = {links: [], items: []};
            expect(instanceOfCollection(object)).toBeTruthy();
        });
    });

    describe('add', () => {
        it('added item is tracked', () => {
            type T = Tracked<LinkedRepresentation> & { me: LinkedRepresentation };
            const resource = SparseRepresentationFactory.make({uri: 'https://example.com'}) as T;
            const toAdd = SparseRepresentationFactory.make({uri: 'https://example.com/me'}) as Tracked<LinkedRepresentation>;
            TrackedRepresentationUtil.add(resource, 'me', toAdd);
            expect(TrackedRepresentationUtil.isTracked(resource, 'me')).toBeTruthy();
        });
    });

    describe('#isTracked', () => {
        test.each([
            //
            // Expected to be tracked
            //
            ['singleton resource, and singleton tracked child', makeRoot(), 'me', makeMe(), true],
            ['singleton resource, and collection tracked child', makeRoot(), 'users', makeUsersCollection(), true],
            ['singleton resource, and not tracked singleton child', makeRoot(), 'me', {}, true],
            ['singleton resource, and not tracked collection child', makeRoot(), 'users', { links: [], items: [] }, true],
            ['singleton resource, and undefined child', makeRoot(), 'me', undefined, false],

            ['collection resource, and collection tracked child', makeUsersCollection(), 'colleagues', makeUsersCollection(), true],
            ['collection resource, and singleton tracked child', makeUsersCollection(), 'aSingletonThatMakesSense?', makeMe(), true],
            ['collection resource, and not tracked singleton child', makeUsersCollection(), 'me', {}, true],
            ['collection resource, and not tracked collection child', makeUsersCollection(), 'users', { links: [], items: [] }, true],

            ['collection resource, and undefined child', makeUsersCollection(), 'colleagues', undefined, false],
        ])('when conditionally tracking: %s', (
            title,
            resource: Tracked<LinkedRepresentation | CollectionRepresentation>,
            propertyToAdd: string,
            child: any,
            expectedTracked: boolean) => {
            if (child) {
                TrackedRepresentationUtil.add(resource, propertyToAdd, child);
            }

            expect(TrackedRepresentationUtil.isTracked(resource, propertyToAdd)).toBe(expectedTracked);
        });

        test.each([
            ['singleton resource, and singleton tracked child', makeRoot(), 'me', makeMe(), false],
            ['singleton resource, and collection tracked child', makeRoot(), 'users', makeUsersCollection(), false],
            ['singleton resource, and not tracked singleton child', makeRoot(), 'me', {}, false],
            ['singleton resource, and not tracked collection child', makeRoot(), 'users', { links: [], items: [] }, false],
            ['singleton resource, and undefined child', makeRoot(), 'me', undefined, false],

            ['collection resource, and singleton tracked child', makeUsersCollection(), 'aSingletonThatMakesSense?', makeMe(), false],
            ['collection resource, and collection tracked child', makeUsersCollection(), 'colleagues', makeUsersCollection(), false],
            ['collection resource, and not tracked singleton child', makeUsersCollection(), 'me', {}, false],
            ['collection resource, and not tracked collection child', makeUsersCollection(), 'users', { links: [], items: [] }, false],
            ['collection resource, and undefined child', makeUsersCollection(), 'colleagues', undefined, false],
        ])('is not tracked when not tracked correctly: %s', (
            title,
            resource: Tracked<LinkedRepresentation | CollectionRepresentation>,
            propertyToAdd: string,
            child: any,
            expectedTracked: boolean) => {
            if (child) {
                SingletonMerger.add(resource, propertyToAdd, child);
            }

            expect(TrackedRepresentationUtil.isTracked(resource, propertyToAdd)).toBe(expectedTracked);
        });
    });

    describe('instanceOf', () => {

        it('true', () => {
            type T = Tracked<LinkedRepresentation>;
            const resource = SparseRepresentationFactory.make({uri: 'https://example.com/1'}) as T;
            expect(instanceOfTrackedRepresentation(resource)).toBeTruthy();
        });

        it('false', () => {
            const resource = {links: []};
            expect(instanceOfTrackedRepresentation(resource)).toBeFalsy();
        });
    });
});
