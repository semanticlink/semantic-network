import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { assertThat, match } from 'mismatched';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import { Status } from '../representation/status';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { LinkRelation } from '../linkRelation';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { get as apiGet } from '../representation/get';
import { Tracked } from '../types/types';
import { ApiOptions } from '../interfaces/apiOptions';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { bottleneckLoader } from '../http/bottleneckLoader';

describe('resource, get, on sub resource', () => {

    const post = jest.fn();
    const get = jest.fn();
    const put = jest.fn();
    const del = jest.fn();

    HttpRequestFactory.Instance(
        { postFactory: post, getFactory: get, putFactory: put, deleteFactory: del, loader: bottleneckLoader }, true);

    afterEach(() => {
        get.mockReset();
    });

    interface UserRepresentation extends LinkedRepresentation {
        name: string;
    }

    type UserCollection = CollectionRepresentation<UserRepresentation>

    interface ApiRepresentation extends LinkedRepresentation {
        version: string;
        users?: UserCollection;
    }

    const uri = 'https://api.example.com';

    test.each([
        [{ rel: 'users', where: `${uri}/user/1`, includeItems: true } as ApiOptions, 4],
        [{ rel: 'users', where: `${uri}/user/1` } as ApiOptions, 3],
        [{ rel: 'users', where: `${uri}/user/notfound`, includeItems: true } as ApiOptions, 4],
        [{ rel: 'users', where: `${uri}/user/notfound` } as ApiOptions, 2],
    ])('load, rel \'%s\'', async (options: ApiOptions, called: number) => {

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
                                rel: 'users',
                                href: `${uri}/users`,
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
                                href: `${uri}/users`,
                            },
                        ],
                        items: [
                            { id: `${uri}/user/1`, title: '' },
                            { id: `${uri}/user/2`, title: '' },
                        ],
                    }, // user feed
                    headers: {},
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
                                href: `${uri}/user/1`,
                            },
                        ],
                        name: 'fred',
                    } as UserRepresentation,
                    headers: {},
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
                                href: `${uri}/user/2`,
                            },
                        ],
                        name: 'hone',
                    } as UserRepresentation,
                    headers: {},
                    status: 200,
                    statusText: '',
                    config: {},
                }
            );
        const $api = { ...SparseRepresentationFactory.make<ApiRepresentation>({ uri }) };
        const user = await apiGet<UserRepresentation>($api, options);

        expect(get).toHaveBeenCalledTimes(called);
        expect(post).not.toBeCalled();
        expect(put).not.toBeCalled();
        expect(del).not.toBeCalled();

        assertThat($api).is(match.predicate(instanceOfSingleton));
        assertThat($api.version).is('56');
        assertThat($api.users).is(match.predicate(instanceOfCollection));

        if (user) {
            assertThat(user).is(match.predicate(instanceOfSingleton));
            const {
                status,
                previousStatus,
                headers,
                collection,
                retrieved,
                singleton,
            } = TrackedRepresentationUtil.getState(user as Tracked);
            assertThat(user).is(match.predicate(instanceOfSingleton));
            assertThat(user.name).isNot(null);
            assertThat(status).is(Status.hydrated);
            assertThat(previousStatus).is(Status.locationOnly);
            assertThat(headers).is({});
            assertThat(collection).is(new Set<string>());
            assertThat(singleton).is(new Set<string>());
            assertThat(retrieved).isNot(null);
        } else {
            assertThat($api.users).isNot(undefined);
        }
    });


});


