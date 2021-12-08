import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { Status } from '../representation/status';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { Tracked } from '../types/types';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { instanceOfTrackedRepresentation } from '../utils/instanceOf/instanceOfTrackedRepresentation';

describe('Tracked Representation Utils', () => {

    describe('location only', function() {
        type T = Tracked<LinkedRepresentation> & { test: string };
        type K = keyof T;
        const resource = SparseRepresentationFactory.make({ uri: 'https://example.com/1' }) as T;

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
            const object: CollectionRepresentation = { links: [], items: [] };
            expect(instanceOfCollection(object)).toBeTruthy();
        });
    });

    describe('add', () => {
        it('added item is tracked', () => {
            type T = Tracked<LinkedRepresentation> & { me: LinkedRepresentation };
            const resource = SparseRepresentationFactory.make({ uri: 'https://example.com' }) as T;
            const toAdd = SparseRepresentationFactory.make({ uri: 'https://example.com/me' }) as Tracked<LinkedRepresentation>;
            TrackedRepresentationUtil.add(resource, 'me', toAdd);
            expect(TrackedRepresentationUtil.isTracked(resource, 'me')).toBeTruthy();
        });
    });

    describe('instanceOf', () => {

        it('true', () => {
            type T = Tracked<LinkedRepresentation>;
            const resource = SparseRepresentationFactory.make({ uri: 'https://example.com/1' }) as T;
            expect(instanceOfTrackedRepresentation(resource)).toBeTruthy();
        });

        it('false', () => {
            const resource = { links: [] };
            expect(instanceOfTrackedRepresentation(resource)).toBeFalsy();
        });
    });
});
