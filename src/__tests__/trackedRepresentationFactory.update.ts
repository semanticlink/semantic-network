import { LinkedRepresentation } from 'semantic-link';
import { assertThat } from 'mismatched';
import { IanaLinkRelation } from '../ianaLinkRelation';
import { assertThat, match } from 'mismatched';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { Status } from '../representation/status';
import TrackedRepresentationUtil from '../utils/trackedRepresentationUtil';
import { Status } from '../models/status';
import { TrackedRepresentation } from '../types/types';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { TrackedRepresentationFactory } from '../representation/trackedRepresentationFactory';
import { DocumentRepresentation } from '../interfaces/document';
import { LinkRelation } from '../linkRelation';
import { instanceOfSingleton } from '../utils/instanceOf';

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

    describe('update', () => {

        const document = jest.fn();

        beforeEach(() => {
            put.mockReset();
            document.mockRestore();
        });

        interface ApiRepresentation extends LinkedRepresentation {
            version: string;
        }

        const uri = 'https://api.example.com';

        test.each([
            [{} as TrackedRepresentation<ApiRepresentation>, 'No state on \'undefined\''],
            [{
                links: [{
                    rel: LinkRelation.Self,
                    href: uri,
                }],
            } as TrackedRepresentation<ApiRepresentation>, `No state on '${uri}'`],
        ])('no state', async (representation: TrackedRepresentation<ApiRepresentation>, err: string) => {
            await expect(async () => await TrackedRepresentationFactory.update(representation, document as unknown as DocumentRepresentation)).rejects.toEqual(err);
            expect(put).not.toHaveBeenCalled();
        });

        describe('state values', () => {

            it('success (204), via http', async () => {
                const $api = SparseRepresentationFactory.make<ApiRepresentation>({ uri });

                put
                    .mockResolvedValue(
                        {
                            data: undefined,
                            headers: { x: 'test' },
                            status: 204,
                            statusText: '',
                            config: {},
                        }
                    );

                const api = await TrackedRepresentationFactory.update($api, document as unknown as DocumentRepresentation) as TrackedRepresentation<ApiRepresentation>;
                expect(put).toHaveBeenCalled();

                const {
                    status,
                    previousStatus,
                    collection,
                    singleton,
                } = TrackedRepresentationUtil.getState(api);
                assertThat(api).is(match.predicate(instanceOfSingleton));
                assertThat(api).is($api);
                // assertThat(api.version).is('56');
                assertThat(status).is(Status.hydrated);
                assertThat(previousStatus).is(Status.locationOnly);
                assertThat(headers).is({ x: 'test' });
                assertThat(collection).is(new Set<string>());
                assertThat(singleton).is(new Set<string>());
                // assertThat(retrieved).is(Date);
            });

            test.each([
                ['success', 200, Status.hydrated, 0, 0, 1, 0],
                ['success', 204, Status.hydrated, 0, 0, 1, 0],
                ['error, client', 400, Status.unknown, 0, 0, 1, 0],
                ['error, client', 403, Status.forbidden, 0, 0, 1, 0],
                // TODO: this returns object and need a better matcher
                // ['error, client (returns object)', 404, match.obj.has({ status: 5 })],
                ['error, server', 500, Status.unknown, 0, 0, 1, 0],
            ])('%s, %s', async (
                title: string,
                statusCode: number,
                currentStatus: Status,
                getCount: number,
                postCount: number,
                putCount: number,
                deleteCount: number) => {
                const $api = SparseRepresentationFactory.make<ApiRepresentation>({ uri });

                put.mockImplementation(async () => {
                    if (statusCode >= 400) {
                        /* emulate that is an axios error to get through code */
                        const rejection = {
                            isAxiosError: true,
                            response: { status: statusCode },
                        };
                        return Promise.reject(rejection);
                    } else {
                        return {
                            data: undefined,
                            headers: [],
                            status: statusCode,
                            statusText: '',
                            config: {},
                        };
                    }
                });
                const api = await TrackedRepresentationFactory.update($api, document as unknown as DocumentRepresentation) as TrackedRepresentation<ApiRepresentation>;
                verifyMocks(getCount, postCount, putCount, deleteCount);

                const { status } = TrackedRepresentationUtil.getState(api);
                assertThat(status).is(currentStatus);
            });

        });

    });

});


