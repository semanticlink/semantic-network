import { SearchUtil } from '../../search/searchUtil';
import {
    CollectionRepresentation,
    FeedRepresentation,
    LinkedRepresentation,
    LinkUtil,
    RelationshipType,
} from 'semantic-link';
import { SparseRepresentationFactory } from '../../representation/sparseRepresentationFactory';
import { TrackedRepresentationFactory } from '../../representation/trackedRepresentationFactory';
import { HttpRequestFactory } from '../../http/httpRequestFactory';
import { bottleneckLoader } from '../../http/bottleneckLoader';
import { AxiosResponse, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import { EqualityUtil } from '../../utils/equalityUtil';
import { TrackedRepresentationUtil } from '../../utils/trackedRepresentationUtil';
import { Tracked } from '../../types/types';
import { Status } from '../../representation/status';

describe('etag aware pooled search collection acceptance', () => {

    const contextCollection = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role' },
            { rel: 'search', href: 'http://api.example.com/role/search' },
        ],
        items: [],
    } as CollectionRepresentation;

    const searchCollection = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/search' },
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [],
    } as CollectionRepresentation;

    const searchResult1 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/search' },
            { rel: 'via', href: 'http://api.example.com/role/search?search=x' },
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            { id: 'http://api.example.com/role/1', title: 'x', eTag: '"hash1"' },
        ],
    } as FeedRepresentation;

    const searchResult2 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/search' },
            { rel: 'via', href: 'http://api.example.com/role/search?search=x' },
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            { id: 'http://api.example.com/role/1', title: 'x2', eTag: '"hash2"' },
        ],
    } as FeedRepresentation;

    const role1 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/1' },
        ],
        name: 'x',
        value: 'j',
    } as LinkedRepresentation;

    const role2 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/1' },
        ],
        name: 'x2',
        value: 'j2',
    } as LinkedRepresentation;

    const searchForm = {
        links: [{ rel: 'self', href: 'http://api.example.com/role/search/form/create' }],
        items: [{ name: 'search', type: 'text' }],
    } as LinkedRepresentation;

    const role = [role1, role2];
    const roleEtags = ['"hash1"', '"hash2"'];

    const searchFeed = [searchResult1, searchResult2];
    const searchFeedEtags = ['"searchhash1"', '"searchhash2"'];


    /**
     * Return a fake of an across-the-wire representation
     */
    const fakeResponseFactory = <T extends LinkedRepresentation>(resource: T, rel: RelationshipType): Partial<AxiosResponse<T>> | never => {
        const uri = LinkUtil.getUri(resource, rel);


        const factoryData = (uri: string): T => {
            switch (uri) {
                case 'http://api.example.com/role':
                    return contextCollection as unknown as T;
                case 'http://api.example.com/role/search':
                    return searchCollection as unknown as T;
                case 'http://api.example.com/role/search?search=x':
                    return searchFeed.shift() as unknown as T;
                case 'http://api.example.com/role/search/form/create':
                    return searchForm as unknown as T;
                case 'http://api.example.com/role/1':
                    return role.shift() as unknown as T;
                default:
                    throw new Error(`Fake not found: ${uri}`);
            }
        };

        const factoryHeaders = (uri: string): RawAxiosResponseHeaders | AxiosResponseHeaders | undefined => {
            switch (uri) {
                case 'http://api.example.com/role':
                    return { ETag: '"contexthash"' };
                case 'http://api.example.com/role/search':
                    return { ETag: '"searchemptyhash"' };
                case 'http://api.example.com/role/search?search=x':
                    return { ETag: searchFeedEtags.shift() };
                case 'http://api.example.com/role/search/form/create':
                    return { ETag: '"formhash"' };
                case 'http://api.example.com/role/1':
                    return { ETag: roleEtags.shift() };
                default:
                    throw new Error(`Fake not found: ${uri}`);
            }
        };

        if (uri) {
            const data = { data: { ...factoryData(uri) }, headers: { ...factoryHeaders(uri) } };
            return data;
        } else {
            throw new Error('Not found');
        }
    };

    describe('retrieval', () => {

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
            },
            true);

        function makeResponse(location: string) {
            return {
                data: {} as LinkedRepresentation,
                headers: { location },
                status: 201,
                statusText: '',
                config: {},
            };
        }

        afterEach(() => {
            get.mockReset();
            post.mockReset();
        });

        beforeEach(() => {
            get.mockImplementation(fakeResponseFactory);

            post
                .mockReturnValueOnce(makeResponse('http://api.example.com/role/search?search=x'))
                .mockReturnValueOnce(makeResponse('http://api.example.com/role/search?search=x'));

        });

        it('creates search collection, retry updates changes', async () => {

            const context = await TrackedRepresentationFactory.load(SparseRepresentationFactory.make({
                uri: 'http://api.example.com/role',
                sparseType: 'collection',
            }));

            const options = {
                includeItems: true,
                equalityMatcher: EqualityUtil.matchesIdAndETag,
            };
            const search = await SearchUtil.search(
                context,
                { search: 'x' },
                options);

            const {
                headers,
                status,
                feedHeaders,
            } = TrackedRepresentationUtil.getState(search as unknown as Tracked);

            expect(headers).toStrictEqual({ ETag: '"searchhash1"' });
            expect(status).toBe(Status.hydrated);
            expect(feedHeaders).toStrictEqual({});

            expect(search.items).toHaveLength(1);

            const item = search.items[0] as unknown as (LinkedRepresentation & { name: string, value: string });
            expect(item.name).toStrictEqual('x');
            expect(item.value).toStrictEqual('j');

            const {
                headers: h,
                status: s,
                feedHeaders: f,
            } = TrackedRepresentationUtil.getState(item as unknown as Tracked);
            expect(h).toStrictEqual({ ETag: '"hash1"' });
            expect(s).toBe(Status.hydrated);
            expect(f).toStrictEqual({ etag: '"hash1"' });


            /**
             * Second retry returns that same collection but the item has been updated (including eTag)
             */
            const retry = await SearchUtil.search(context, { search: 'x' }, options);

            const {
                headers: h2,
                status: s2,
                feedHeaders: f2,
            } = TrackedRepresentationUtil.getState(search as unknown as Tracked);

            expect(h2).toStrictEqual({ ETag: '"searchhash2"' });
            expect(s2).toBe(Status.hydrated);
            expect(f2).toStrictEqual({});

            expect(retry.items).toHaveLength(1);

            const item2 = search.items[0] as unknown as (LinkedRepresentation & { name: string, value: string });
            expect(item2.name).toStrictEqual('x2');
            expect(item2.value).toStrictEqual('j2');

            const {
                headers: h3,
                status: s3,
                feedHeaders: f3,
            } = TrackedRepresentationUtil.getState(item as unknown as Tracked);
            expect(h3).toStrictEqual({ ETag: '"hash2"' });
            expect(s3).toBe(Status.hydrated);
            expect(f3).toStrictEqual({ etag: '"hash2"' });

        });
    });

});
