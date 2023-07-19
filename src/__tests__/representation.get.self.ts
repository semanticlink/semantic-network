import { LinkedRepresentation } from 'semantic-link';
import { assertThat, match } from 'mismatched';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { LinkRelation } from '../linkRelation';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { get as apiGet } from '../representation/get';
import { ApiOptions } from '../interfaces/apiOptions';
import { bottleneckLoader } from '../http/bottleneckLoader';


describe('resource, get, on self', () => {

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

    afterEach(() => {
        get.mockReset();
    });

    interface ApiRepresentation extends LinkedRepresentation {
        version: string;
    }

    const uri = 'https://api.example.com';

    test.each([
        [{ rel: LinkRelation.Self } as ApiOptions, 1],
    ])('load, \'%s\'', async (options: ApiOptions, called: number) => {

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
            );
        const $api = { ...SparseRepresentationFactory.make<ApiRepresentation>({ uri }) };
        const api = await apiGet<ApiRepresentation>($api, options);

        expect(get).toHaveBeenCalledTimes(called);
        expect(post).not.toBeCalled();
        expect(put).not.toBeCalled();
        expect(del).not.toBeCalled();

        assertThat($api).is(match.predicate(instanceOfSingleton));
        assertThat(api).is(match.predicate(instanceOfSingleton));
        assertThat(api).is($api);

        // loading of self doesn't created self as a subresource
        assertThat($api)
            .is(match.obj.has({
                links: match.ofType.array(),
                version: '56',
                self: match.isEquals(undefined),
            }));

    });

});


