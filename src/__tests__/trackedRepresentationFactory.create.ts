import { LinkedRepresentation } from 'semantic-link';
import { assertThat, match } from 'mismatched';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { Status } from '../representation/status';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { TrackedRepresentationFactory } from '../representation/trackedRepresentationFactory';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import { LinkRelation } from '../linkRelation';
import { instanceOfTrackedRepresentation } from '../utils/instanceOf/instanceOfTrackedRepresentation';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { bottleneckLoader } from '../http/bottleneckLoader';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';

describe('Tracked Representation Factory', () => {

    const post = jest.fn();
    const get = jest.fn();
    const put = jest.fn();
    const del = jest.fn();

    HttpRequestFactory.Instance(
        {
            postFactory: post,
            getFactory: get,
            putFactory: put,
            deleteFactory: del,
            loader: bottleneckLoader,
        }, true);

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
            [{} as LinkedRepresentation, {}, 'create tracked representation has no context to find uri to POST on'],
        ])('no uri found, throws', async (representation: LinkedRepresentation, options: HttpRequestOptions, err: string) => {
            await expect(async () => await TrackedRepresentationFactory.create(representation, {}, options)).rejects.toEqual(Error(err));
            expect(post).not.toHaveBeenCalled();
        });

        test.each([
            [true],
            [false],
        ])('catch response error, throws %s', async (throws: boolean) => {

            const $api = SparseRepresentationFactory.make<ApiRepresentation>({ uri });
            post.mockRejectedValue(new Error('ouch'));

            const options = { throwOnCreateError: throws };

            if (throws) {
                await expect(async () =>
                    await TrackedRepresentationFactory.create($api, {}, options))
                    .rejects
                    .toEqual(Error('ouch'));
            } else {
                const actual = await TrackedRepresentationFactory.create($api, {}, options);
                expect(actual).toBeUndefined();
            }
            expect(post).toHaveBeenCalled();
        });

        test.each([
            [201, true, 1, 1, 0, 0],
            [200, false, 0, 1, 0, 0],
            [202, false, 0, 1, 0, 0],
            [400, false, 0, 1, 0, 0],
            [500, false, 0, 1, 0, 0],
        ])('status code, %s', async (
            statusCode: number,
            returns: boolean,
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
                                rel: LinkRelation.Self,
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
                if (instanceOfTrackedRepresentation(actual)) {
                    const { status } = TrackedRepresentationUtil.getState(actual);
                    assertThat(actual).is(match.predicate(instanceOfSingleton));
                    assertThat(status).is(Status.locationOnly);
                }
            } else {
                expect(actual).toBeUndefined();
            }
        });

    });
});
