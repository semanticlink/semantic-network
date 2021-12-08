import { LinkedRepresentation, RelationshipType } from 'semantic-link';
import { assertThat, match } from 'mismatched';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import { Status } from '../representation/status';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { LinkRelation } from '../linkRelation';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { get as apiGet } from '../representation/get';
import { Tracked } from '../types/types';
import { bottleneckLoader } from '../http/bottleneckLoader';


describe('resource, get, on sparse', () => {

    const post = jest.fn();
    const get = jest.fn();
    const put = jest.fn();
    const del = jest.fn();

    HttpRequestFactory.Instance(
        { postFactory: post, getFactory: get, putFactory: put, deleteFactory: del, loader: bottleneckLoader }, true);

    afterEach(() => {
        post.mockReset();
    });

    interface UserRepresentation extends LinkedRepresentation {
        name: string;
    }

    interface ApiRepresentation extends LinkedRepresentation {
        version: string;
        me?: UserRepresentation;
    }

    const uri = 'https://api.example.com';

    test.each([
        ['me', 2],
        ['me-not-there', 1],
    ])('load, rel \'%s\'', async (rel: RelationshipType, called: number) => {

        get
            .mockResolvedValueOnce(
                {
                    data: {
                        links: [
                            {
                                rel: LinkRelation.Self,
                                href: uri,
                            },
                            {
                                rel: 'me',
                                href: `${uri}/me`,
                            },
                        ],
                        version: '56',
                    } as ApiRepresentation,
                    headers: { x: 'test' },
                    status: 200,
                    statusText: '',
                    config: {},
                }
            )
            .mockResolvedValueOnce(
                {
                    data: {
                        links: [
                            {
                                rel: LinkRelation.Self,
                                href: `${uri}/me`,
                            },
                        ],
                        name: 'me',
                    } as UserRepresentation,
                    headers: {},
                    status: 200,
                    statusText: '',
                    config: {},
                }
            );
        const $api = SparseRepresentationFactory.make<ApiRepresentation>({ uri });
        const me = await apiGet<UserRepresentation>($api, { rel });
        expect(get).toHaveBeenCalledTimes(called);
        expect(post).not.toHaveBeenCalledTimes(called);
        expect(put).not.toHaveBeenCalledTimes(called);
        expect(del).not.toHaveBeenCalledTimes(called);

        assertThat($api).is(match.predicate(instanceOfSingleton));
        assertThat($api.version).is('56');

        if (me) {
            assertThat($api.me).is(match.predicate(instanceOfSingleton));

            const {
                status,
                previousStatus,
                headers,
                collection,
                retrieved,
                singleton,
            } = TrackedRepresentationUtil.getState(me as Tracked);
            assertThat(me).is(match.predicate(instanceOfSingleton));
            assertThat(me.name).is('me');
            assertThat(status).is(Status.hydrated);
            assertThat(previousStatus).is(Status.locationOnly);
            assertThat(headers).is({  });
            assertThat(collection).is(new Set<string>());
            assertThat(singleton).is(new Set<string>());
            assertThat(retrieved).isNot(null);
        } else {
            assertThat($api.me).is(undefined);
        }
    });


});


