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
import { AxiosResponse } from 'axios';
import { EqualityUtil } from '../../utils/equalityUtil';

describe('pooled search collection acceptance', () => {

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
            { rel: 'up', href: 'up-x' },
            { rel: 'other', href: 'other-x' },
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [],
    } as CollectionRepresentation;

    const searchResult1 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/search?search=x' },
            { rel: 'up', href: 'up-x-should-not-be-copied' },
            { rel: 'should-not-be-copied', href: 'should-not-be-copied' },
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [
            { id: 'http://api.example.com/role/1', title: 'x' },
        ],
    } as FeedRepresentation;

    const searchResult2 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/search?search=x' },
            { rel: 'should-not-be-copied', href: 'should-not-be-copied' },
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [
            { id: 'http://api.example.com/role/1', title: 'x' },
            { id: 'http://api.example.com/role/2', title: 'x2' },
        ],
    } as FeedRepresentation;

    const searchResult3 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/search?search=x' },
            { rel: 'should-not-be-copied', href: 'should-not-be-copied' },
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [
            { id: 'http://api.example.com/role/3', title: 'x3' },
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
            { rel: 'self', href: 'http://api.example.com/role/2' },
        ],
        name: 'x2',
        value: 'j2',
    } as LinkedRepresentation;

    const role3 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/3' },
        ],
        name: 'x3',
        value: 'j3',
    } as LinkedRepresentation;

    const searchForm = {
        links: [{ rel: 'self', href: 'http://api.example.com/role/search/form/create' }],
        items: [{ name: 'search', type: 'text' }],
    } as LinkedRepresentation;

    /**
     * Return a fake of an across-the-wire representation
     */
    const fakeResponseFactory = <T extends LinkedRepresentation>(resource: T, rel: RelationshipType): Partial<AxiosResponse<T>> | never => {
        const uri = LinkUtil.getUri(resource, rel);

        function factory(uri: string): T {
            switch (uri) {
                case 'http://api.example.com/role':
                    return contextCollection as unknown as T;
                case 'http://api.example.com/role/1':
                    return role1 as unknown as T;
                case 'http://api.example.com/role/2':
                    return role2 as unknown as T;
                case 'http://api.example.com/role/3':
                    return role3 as unknown as T;
                case 'http://api.example.com/role/search?search=x':
                    return searchResult1 as unknown as T;
                case 'http://api.example.com/role/search?search=x2':
                    return searchResult2 as unknown as T;
                case 'http://api.example.com/role/search?search=x3':
                    return searchResult3 as unknown as T;
                case 'http://api.example.com/role/search':
                    return searchCollection as unknown as T;
                case 'http://api.example.com/role/search/form/create':
                    return searchForm as unknown as T;
                default:
                    throw new Error(`Fake not found: ${uri}`);
            }
        }

        if (uri) {
            return { data: { ...factory(uri) } };
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

        function getValue(location: string) {
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
                .mockReturnValueOnce(getValue('http://api.example.com/role/search?search=x'))
                .mockReturnValueOnce(getValue('http://api.example.com/role/search?search=x2'))
                .mockReturnValueOnce(getValue('http://api.example.com/role/search?search=x3'))
                .mockReturnValueOnce(getValue('http://api.example.com/role/search?search=x2'))
                .mockReturnValueOnce(getValue('http://api.example.com/role/search?search=x3'))
                .mockReturnValueOnce(getValue('http://api.example.com/role/search?search=x1'))
                .mockReturnValueOnce(getValue('http://api.example.com/role/search?search=x2'))
                .mockReturnValueOnce(getValue('http://api.example.com/role/search?search=x3'));

        });

        it('creates search collection', async () => {

            const resource = await TrackedRepresentationFactory.load(SparseRepresentationFactory.make({
                uri: 'http://api.example.com/role',
                sparseType: 'collection',
            }));

            let posts = 0;
            let gets = 1;

            const addPosts = (increment: number): number => {
                posts += increment;
                return posts;
            };
            const addGets = (increment: number): number => {
                gets += increment;
                return gets;
            };

            expect(get).toHaveBeenCalledTimes(gets);

            const results = await SearchUtil.search(resource, { search: 'x' }, { includeItems: true });
            expect(get).toHaveBeenCalledTimes(addGets(3 + 1 /* includeItems: true */));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            await SearchUtil.search(resource, { search: 'x2' });
            expect(get).toHaveBeenCalledTimes(addGets(1));
            expect(post).toHaveBeenCalledTimes(addPosts(1));


            await SearchUtil.search(resource, { search: 'x3' });
            expect(get).toHaveBeenCalledTimes(addGets(1));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            await SearchUtil.search(resource, { search: 'x2' }, { includeItems: true });
            expect(get).toHaveBeenCalledTimes(addGets(1 + 2));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            expect(results).toBeDefined();

            expect(LinkUtil.matches(results, 'should-not-be-copied')).toBeFalsy();
            expect(LinkUtil.getUri(results, 'up')).toBe('up-x');

            expect(get).toHaveBeenCalledTimes(gets);
            expect(post).toHaveBeenCalledTimes(posts);
            expect(del).not.toHaveBeenCalled();
            expect(put).not.toHaveBeenCalled();
        });
        it('creates search collection etag aware', async () => {

            const resource = await TrackedRepresentationFactory.load(SparseRepresentationFactory.make({
                uri: 'http://api.example.com/role',
                sparseType: 'collection',
            }));

            let posts = 0;
            let gets = 1;

            const addPosts = (increment: number): number => {
                posts += increment;
                return posts;
            };
            const addGets = (increment: number): number => {
                gets += increment;
                return gets;
            };

            expect(get).toHaveBeenCalledTimes(gets);

            const results = await SearchUtil.search(
                resource,
                { search: 'x' },
                {
                    includeItems: true,
                    equalityMatcher: EqualityUtil.matchesIdAndETag,
                });
            expect(get).toHaveBeenCalledTimes(addGets(3 + 1 /* includeItems: true */));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            await SearchUtil.search(resource, { search: 'x2' });
            expect(get).toHaveBeenCalledTimes(addGets(1));
            expect(post).toHaveBeenCalledTimes(addPosts(1));


            await SearchUtil.search(resource, { search: 'x3' });
            expect(get).toHaveBeenCalledTimes(addGets(1));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            await SearchUtil.search(resource, { search: 'x2' }, { includeItems: true });
            expect(get).toHaveBeenCalledTimes(addGets(1 + 2));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            expect(results).toBeDefined();

            expect(LinkUtil.matches(results, 'should-not-be-copied')).toBeFalsy();
            expect(LinkUtil.getUri(results, 'up')).toBe('up-x');

            expect(get).toHaveBeenCalledTimes(gets);
            expect(post).toHaveBeenCalledTimes(posts);
            expect(del).not.toHaveBeenCalled();
            expect(put).not.toHaveBeenCalled();
        });
    });

});
