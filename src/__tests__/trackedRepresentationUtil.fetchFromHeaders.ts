import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { Tracked } from '../types/types';

type T = Tracked<LinkedRepresentation> & { me: LinkedRepresentation } & { users: CollectionRepresentation };
const makeRoot = () => SparseRepresentationFactory.make({ uri: 'https://example.com' }) as T;
const makeMe = () => SparseRepresentationFactory.make(
    { uri: 'https://example.com/me' }) as Tracked<LinkedRepresentation>;
const makeUsersCollection = () => SparseRepresentationFactory.make(
    { uri: 'https://example.com/users', sparseType: 'collection' }) as Tracked<LinkedRepresentation>;


describe('Tracked Representation Utils (fetch from headers)', () => {

    describe('#isTracked', () => {
        test.each([
            //
            // Expected to be tracked
            //
            ['singleton resource, and singleton tracked child', makeRoot(), 'me', makeMe(), true],
            ['singleton resource, and collection tracked child', makeRoot(), 'users', makeUsersCollection(), true],
            ['singleton resource, and not tracked singleton child', makeRoot(), 'me', {}, true],
            ['singleton resource, and not tracked collection child', makeRoot(), 'users', {
                links: [],
                items: [],
            }, true],
            ['singleton resource, and undefined child', makeRoot(), 'me', undefined, false],

            ['collection resource, and collection tracked child', makeUsersCollection(), 'colleagues', makeUsersCollection(), true],
            ['collection resource, and singleton tracked child', makeUsersCollection(), 'aSingletonThatMakesSense?', makeMe(), true],
            ['collection resource, and not tracked singleton child', makeUsersCollection(), 'me', {}, true],
            ['collection resource, and not tracked collection child', makeUsersCollection(), 'users', {
                links: [],
                items: [],
            }, true],

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

    });

});
