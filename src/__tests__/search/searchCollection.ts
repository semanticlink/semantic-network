import { SearchUtil } from '../../search/searchUtil';
import { CollectionRepresentation } from 'semantic-link';
import { SparseRepresentationFactory } from '../../representation/sparseRepresentationFactory';
import { assertThat, match } from 'mismatched';
import { TrackedRepresentationFactory } from '../../representation/trackedRepresentationFactory';
import { HttpRequestFactory } from '../../http/httpRequestFactory';
import { bottleneckLoader } from '../../http/bottleneckLoader';

describe('pooled search collection', () => {

    // create a pooled collection


    describe('init errors: ', () => {
        it('tracked collection not passed in', () => {
            expect(() => {
                SearchUtil.makePooledCollection({} as CollectionRepresentation);
            }).toThrowError('Failed to create pool collection');
        });
        it('link rel not exists', () => {
            const coll = SparseRepresentationFactory.make({
                uri: 'http://api.example.com/role',
                sparseType: 'collection',
            });
            expect(() => {
                SearchUtil.makePooledCollection(coll);
            }).toThrowError('The pool collection requires a link relation');
        });
        it('link rel not found', () => {
            const coll = SparseRepresentationFactory.make({
                uri: 'http://api.example.com/role',
                sparseType: 'collection',
            });
            expect(() => {
                SearchUtil.makePooledCollection(coll, { rel: 'search' });
            }).toThrowError('Link relation \'search\' not found');
        });
    });

    describe('init', () => {

        const contextCollection = {
            links: [
                { rel: 'self', href: 'http://api.example.com/role' },
                { rel: 'search', href: 'http://api.example.com/role/search' },
            ],
            items: [],
        } as CollectionRepresentation;

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


        it('creates new as singleton collection', async () => {
            get.mockResolvedValueOnce({
                data: contextCollection,
                headers: { x: 'test' },
                status: 200,
                statusText: '',
                config: {},
            });

            const resource = await TrackedRepresentationFactory.load(SparseRepresentationFactory.make({
                uri: 'http://api.example.com/role',
                sparseType: 'collection',
            }));
            const result = SearchUtil.makePooledCollection(resource, { rel: 'search' });

            const searchCollection = {
                links: [{ rel: 'self', href: 'http://api.example.com/role/search' }],
                items: [],
            };

            assertThat(result)
                .is(match.obj.has({
                    links: searchCollection.links,
                    items: searchCollection.items,
                }));

            expect(get).toHaveBeenCalledTimes(1);
        });

        it('retrieve existing', async () => {
            get.mockResolvedValueOnce({
                data: contextCollection,
                headers: { x: 'test' },
                status: 200,
                statusText: '',
                config: {},
            });

            const resource = await TrackedRepresentationFactory.load(SparseRepresentationFactory.make({
                uri: 'http://api.example.com/role',
                sparseType: 'collection',
            }));
            const result = SearchUtil.makePooledCollection(resource, { rel: 'search' });
            const retrieveAgain = SearchUtil.makePooledCollection(resource, { rel: 'search' });

            const searchCollection = {
                links: [{ rel: 'self', href: 'http://api.example.com/role/search' }],
                items: [],
            };
            assertThat(result)
                .is(match.obj.has({
                    links: searchCollection.links,
                    items: searchCollection.items,
                }));
            assertThat(retrieveAgain).is(result);
            expect(get).toHaveBeenCalledTimes(1);
        });
    });
});
