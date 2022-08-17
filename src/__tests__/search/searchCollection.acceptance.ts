import SearchUtil from '../../search/searchUtil';
import {
    CollectionRepresentation,
    FeedRepresentation,
    LinkedRepresentation,
    LinkUtil,
    RelationshipType,
} from 'semantic-link';
import {
    pooledCollectionMakeStrategy,
    SparseRepresentationFactory,
} from '../../representation/sparseRepresentationFactory';
import { TrackedRepresentationFactory } from '../../representation/trackedRepresentationFactory';
import { HttpRequestFactory } from '../../http/httpRequestFactory';
import { bottleneckLoader } from '../../http/bottleneckLoader';
import { create } from '../../representation/create';
import { AxiosResponse } from 'axios';
import { DocumentRepresentation } from '../../interfaces/document';
import { ApiUtil } from '../../apiUtil';
import { CollectionMerger } from '../../representation/collectionMerger';

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
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [],
    } as CollectionRepresentation;

    const searchResult1 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/search?search=x' },
            { rel: 'create-form', href: 'http://api.example.com/role/search/form/create' },
        ],
        items: [
            { id: 'http://api.example.com/role/1', title: 'x' },
        ],
    } as FeedRepresentation;

    const searchResult2 = {
        links: [
            { rel: 'self', href: 'http://api.example.com/role/search?search=x' },
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

        it('creates new as singleton collection', async () => {

            const resource = await TrackedRepresentationFactory.load(SparseRepresentationFactory.make({
                uri: 'http://api.example.com/role',
                sparseType: 'collection',
            }));

            const options = { rel: 'search', name: '.search' };
            const searchResults = SearchUtil.makePooledCollection(resource, options);

            const context = await ApiUtil.get(resource, options) as CollectionRepresentation;
            const results = await create(
                { search: 'x' } as DocumentRepresentation,
                {
                    createContext: context,
                    makeSparseStrategy: (o) => pooledCollectionMakeStrategy(searchResults, o),
                }) as CollectionRepresentation;

            CollectionMerger.merge(context, results);

            expect(context.items).toHaveLength(1);
            expect(searchResults.items).toHaveLength(1);
            expect(results.items).toHaveLength(1);

            const results2 = await create(
                { search: 'x2' } as DocumentRepresentation,
                {
                    createContext: context,
                    makeSparseStrategy: (o) => pooledCollectionMakeStrategy(searchResults, o),
                }) as CollectionRepresentation;
            CollectionMerger.merge(context, results2);

            expect(context.items).toHaveLength(2);
            expect(searchResults.items).toHaveLength(2);
            expect(results.items).toHaveLength(1);
            expect(results2.items).toHaveLength(2);

            const results3 = await create(
                { search: 'x3' } as DocumentRepresentation,
                {
                    createContext: context,
                    makeSparseStrategy: (o) => pooledCollectionMakeStrategy(searchResults, o),
                }) as CollectionRepresentation;
            CollectionMerger.merge(context, results3);

            expect(results).toBeDefined();
            expect(context.items).toHaveLength(1);
            expect(searchResults.items).toHaveLength(3);
            expect(results.items).toHaveLength(1);
            expect(results3.items).toHaveLength(1);

            expect(get).toHaveBeenCalledTimes(4 + 2);
            expect(post).toHaveBeenCalledTimes(1 + 2);
            expect(del).not.toHaveBeenCalled();
            expect(put).not.toHaveBeenCalled();
        });

        it('creates new as singleton collection refactored', async () => {

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

            const results = await SearchUtil.search(resource, { search: 'x' });
            expect(get).toHaveBeenCalledTimes(addGets(3));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            await SearchUtil.search(resource, { search: 'x2' });
            expect(get).toHaveBeenCalledTimes(addGets(1));
            expect(post).toHaveBeenCalledTimes(addPosts(1));


            await SearchUtil.search(resource, { search: 'x3' });
            expect(get).toHaveBeenCalledTimes(addGets(1));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            await SearchUtil.search(resource, { search: 'x2' });
            expect(get).toHaveBeenCalledTimes(addGets(1));
            expect(post).toHaveBeenCalledTimes(addPosts(1));

            expect(results).toBeDefined();

            expect(get).toHaveBeenCalledTimes(gets);
            expect(post).toHaveBeenCalledTimes(posts);
            expect(del).not.toHaveBeenCalled();
            expect(put).not.toHaveBeenCalled();
        });
    });

});
