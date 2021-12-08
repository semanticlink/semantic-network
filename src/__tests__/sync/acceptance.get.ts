import { resource, selfUri as workflowUri } from '../fixtures/1/organisation/a65/step/314-workflow';
import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { fakeResponseFactory } from '../fixtures/1/fakeResponseFactory';
import { SparseRepresentationFactory } from '../../representation/sparseRepresentationFactory';
import { Tracked } from '../../types/types';
import { LinkRelation } from '../../linkRelation';
import { assertThat } from 'mismatched';
import { ApiUtil } from '../../apiUtil';

/**
 * Helper to create a {@link LinkedRepresentation} with {@link State}
 */
const makeFromFixture = <T extends LinkedRepresentation>(document: T): Tracked<T> =>
    // note: clone the document for multiple uses
    SparseRepresentationFactory.make({ on: { ...document } });

describe('get', () => {

    describe('root', () => {
        const get = jest.fn().mockImplementation(fakeResponseFactory);
        const put = jest.fn();
        const del = jest.fn();
        const post = jest.fn();

        afterEach(() => {
            get.mockReset();
            put.mockReset();
            post.mockReset();
            del.mockReset();
        });

        it('load, forceLoad hydrated', async () => {
            await ApiUtil.get(
                makeFromFixture(resource),
                { getFactory: get, putFactory: put, deleteFactory: del, postFactory: post, forceLoad: true });

            const calls = [
                [LinkRelation.Self, workflowUri],
            ];

            const actualCalls = get?.mock.calls.map((x: any) => [x[1], LinkUtil.getUri(x[0], x[1])]);
            assertThat(calls).is(actualCalls);

            expect(post).not.toHaveBeenCalled();
            expect(put).not.toHaveBeenCalled();
            expect(del).not.toHaveBeenCalled();
        });
    });
});
