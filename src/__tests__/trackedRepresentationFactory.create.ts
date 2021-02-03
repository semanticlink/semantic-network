import { LinkedRepresentation } from 'semantic-link';
import { IanaLinkRelation } from '../ianaLinkRelation';
import { assertThat } from 'mismatched';
import TrackedRepresentationUtil from '../utils/trackedRepresentationUtil';
import { singletonRepresentation } from '../representationMatcher';
import { Status } from '../models/status';
import SparseRepresentationFactory from '../representation/sparseRepresentationFactory';
import TrackedRepresentationFactory from '../representation/trackedRepresentationFactory';
import { HttpRequestFactory } from '../http/httpRequestFactory';

describe('Tracked Representation Factory', () => {

    const post = jest.fn();
    const get = jest.fn();
    const put = jest.fn();
    const del = jest.fn();

    HttpRequestFactory.Instance(
        { postFactory: post, getFactory: get, putFactory: put, deleteFactory: del }, true);

    function verifyMocks(getCount: number, postCount: number, putCount: number, deleteCount: number): void {
        assertThat({
            get: get.mock.calls.length,
            post: post.mock.calls.length,
            put: put.mock.calls.length,
            del: del.mock.calls.length,
        }).is({
            get: getCount,
            post: postCount,
            put: putCount,
            del: deleteCount,
        });
    }

    afterEach(() => {
        post.mockReset();
    });

    describe('create', () => {

        interface ApiRepresentation extends LinkedRepresentation {
            version: string;
        }

        const uri = 'https://api.example.com';

        test.each([
            [{} as LinkedRepresentation, 'No context to find uri to POST on'],
        ])('no uri found, throws', async (representation: LinkedRepresentation, err: string) => {
            await expect(async () => await TrackedRepresentationFactory.create(representation, {})).rejects.toEqual(err);
            expect(post).not.toHaveBeenCalled();
        });

        test.each([
            [201, true, 1, 1, 0, 0],
            [200, undefined, 0, 1, 0, 0],
            [202, undefined, 0, 1, 0, 0],
            [400, undefined, 0, 1, 0, 0],
            [500, undefined, 0, 1, 0, 0],
        ])('status code, %s', async (
            statusCode: number,
            returns: boolean | undefined,
            getCount: number,
            postCount: number,
            putCount: number,
            deleteCount: number) => {

            const $api = SparseRepresentationFactory.make<ApiRepresentation>({ uri });

            post.mockResolvedValue(
                {
                    data: {
                        links: [
                            {
                                rel: IanaLinkRelation.self,
                                href: uri,
                            }],
                    } as LinkedRepresentation,
                    headers: statusCode === 201 ? { location: uri } : {},
                    status: statusCode,
                    statusText: '',
                    config: {},
                }
            );
            const actual = await TrackedRepresentationFactory.create($api, {});
            expect(post).toHaveBeenCalled();

            verifyMocks(getCount, postCount, putCount, deleteCount);

            if (returns) {
                expect(actual).toBeDefined();
                // the inside load "fails" returning the location only
                if (actual) {
                    const { status } = TrackedRepresentationUtil.getState(actual);
                    assertThat(actual).is(singletonRepresentation);
                    assertThat(status).is(Status.locationOnly);
                }
            } else {
                expect(actual).toBeUndefined();
            }
        });

    });
});