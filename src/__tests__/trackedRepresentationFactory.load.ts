import { LinkedRepresentation } from 'semantic-link';
import { assertThat, match } from 'mismatched';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import { Status } from '../representation/status';
import { TrackedRepresentation } from '../types/types';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { TrackedRepresentationFactory } from '../representation/trackedRepresentationFactory';
import { LinkRelation } from '../linkRelation';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { bottleneckLoader } from '../http/bottleneckLoader';

describe('Tracked Representation Factory', () => {

    const post = jest.fn();
    const get = jest.fn();
    const put = jest.fn();
    const del = jest.fn();

    HttpRequestFactory.Instance(
        { postFactory: post, getFactory: get, putFactory: put, deleteFactory: del, loader: bottleneckLoader }, true);

    afterEach(() => {
        post.mockReset();
    });

    describe('load', () => {

        interface ApiRepresentation extends LinkedRepresentation {
            version: string;
        }

        const uri = 'https://api.example.com';

        xtest.each([
            [{} as TrackedRepresentation<ApiRepresentation>, 'load tracked representation has no state on \'undefined\''],
        ])('no state', async (representation: TrackedRepresentation<ApiRepresentation>, err: string) => {
            await expect(async () => await TrackedRepresentationFactory.load(representation)).rejects.toEqual(err);
            expect(get).not.toHaveBeenCalled();
        });

        test.each([
            [{
                links: [{
                    rel: LinkRelation.Self,
                    href: uri,
                }],
            } as TrackedRepresentation<ApiRepresentation>],
        ])('no state', async (representation: TrackedRepresentation<ApiRepresentation>) => {

            const api = await TrackedRepresentationFactory.load(representation);
            expect(get).toHaveBeenCalled();
            assertThat(api).isNot(undefined);
        });

        test.each([
            Status.virtual,
            Status.forbidden,
        ])('virtual, forbidden status \'%s\'', async (status: Status) => {
            const $api = SparseRepresentationFactory.make<ApiRepresentation>({ status, uri });
            const api = await TrackedRepresentationFactory.load($api);
            expect(get).not.toHaveBeenCalled();
            assertThat(api).is($api);
        });

        test.each([
            Status.deleted,
            Status.deleteInProgress,
        ])('deleted status \'%s\'', async (status: Status) => {
            const $api = SparseRepresentationFactory.make<ApiRepresentation>({ status, uri });
            const actual = async () => await TrackedRepresentationFactory.load($api);
            await expect(actual).rejects.toEqual('Resource is deleted https://api.example.com');
            expect(get).not.toHaveBeenCalled();
        });

        describe('state values', () => {
            const $api = SparseRepresentationFactory.make<ApiRepresentation>({ uri });

            it('success (200), singleton load via http', async () => {

                get
                    .mockResolvedValue(
                        {
                            data: {
                                links: [
                                    {
                                        rel: LinkRelation.Self,
                                        href: uri,
                                    }],
                                version: '56',
                            } as ApiRepresentation,
                            headers: { x: 'test' },
                            status: 200,
                            statusText: '',
                            config: {},
                        }
                    );

                const api = await TrackedRepresentationFactory.load($api) as TrackedRepresentation<ApiRepresentation>;
                expect(get).toHaveBeenCalled();

                const {
                    status,
                    previousStatus,
                    headers,
                    collection,
                    retrieved,
                    singleton,
                } = TrackedRepresentationUtil.getState(api);
                assertThat(api).is(match.predicate(instanceOfSingleton));
                assertThat(api).is($api);
                assertThat(api.version).is('56');
                assertThat(status).is(Status.hydrated);
                assertThat(previousStatus).is(Status.locationOnly);
                assertThat(headers).is({ x: 'test' });
                assertThat(collection).is(new Set<string>());
                assertThat(singleton).is(new Set<string>());
                assertThat(retrieved).isNot(null);
            });

        });

    });

});


