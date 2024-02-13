import { State } from '../representation/state';
import { Status } from '../representation/status';

describe('State', () => {
    it('should be defined as unknown', () => {
        const state = new State();
        expect(state).not.toBeNull();
        expect(state.status).toBe(Status.unknown);
    });
    it('should be defined', () => {
        const state = new State(Status.locationOnly);
        expect(state).not.toBeNull();
        expect(state.status).toBe(Status.locationOnly);
    });
    it('should have etag set', () => {
        const { headers: { etag: eTag = undefined } } = new State(Status.locationOnly, 'xx');
        expect(eTag).toBe('xx');
    });
    it('should have etag not set', () => {
        const { headers: { etag: eTag = undefined } } = new State(Status.locationOnly);
        expect(eTag).toBe(undefined);
    });
});
