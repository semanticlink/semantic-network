import { CollectionRepresentation, LinkedRepresentation, LinkUtil, Uri } from 'semantic-link';
import { assertThat, match } from 'mismatched';
import { HttpRequestFactory } from '../http/httpRequestFactory';
import { Status } from '../representation/status';
import { Tracked } from '../types/types';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { TrackedRepresentationFactory } from '../representation/trackedRepresentationFactory';
import { LinkRelation } from '../linkRelation';
import { bottleneckLoader } from '../http/bottleneckLoader';
import { TrackedRepresentationUtil } from '../utils/trackedRepresentationUtil';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { instanceOfTrackedRepresentation } from '../utils/instanceOf/instanceOfTrackedRepresentation';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';
import { ApiOptions } from '../interfaces/apiOptions';

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

    afterEach(() => {
        post.mockReset();
    });

    describe('load collection', () => {
        const uri = 'https://api.example.com/collection';

        test.each([
            [{
                links: [{ rel: LinkRelation.Self, href: uri }],
                items: [] as LinkedRepresentation[],
            } as Tracked<CollectionRepresentation>],
        ])('no state', async (representation: Tracked<CollectionRepresentation>) => {
            const collection = await TrackedRepresentationFactory.load(representation);
            expect(get).toHaveBeenCalled();
            assertThat(collection).isNot(undefined);
        });

        test.each([
            Status.virtual,
            Status.forbidden,
        ])('virtual, forbidden status \'%s\'', async (status: Status) => {
            const collection = SparseRepresentationFactory.make<CollectionRepresentation>(
                { status, uri, sparseType: 'collection' });
            const api = await TrackedRepresentationFactory.load(collection);
            expect(get).not.toHaveBeenCalled();
            assertThat(api).is(collection);
        });

        test.each([
            Status.deleted,
            Status.deleteInProgress,
        ])('deleted status \'%s\'', async (status: Status) => {
            const collection = SparseRepresentationFactory.make<CollectionRepresentation>(
                { status, uri, sparseType: 'collection' });
            /*const actual = async () => */
            await TrackedRepresentationFactory.load(collection);
            // old behaviour was to reject - now it is to return original without call
            // await expect(actual).rejects.toEqual(Error('Resource \'deleted\' unable to load \'https://api.example.com/collection\''));
            expect(get).not.toHaveBeenCalled();
        });
    });


    test.each([
        [
            'An empty collection',
            'https://api.example.com/collection',
            { includeItems: false },
            false,
            {
                'https://api.example.com/collection': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/collection' }],
                    'items': [],
                },
            },
            Status.hydrated,
            0,
            Status.unknown,
            1,
        ],

        // a collection with one item, which is not loaded
        [
            'A collection resource with one item that is not eagerly loaded (location only)',
            'https://api.example.com/collection',
            { includeItems: false },
            false,
            {
                'https://api.example.com/collection': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/collection' }],
                    'items': [{ 'id': 'https://api.example.com/item/1' }],
                },
                'https://api.example.com/item/1': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/item/1' }],
                },
            },
            Status.hydrated,
            1,
            Status.locationOnly,
            1,
        ],

        [
            'A collection with one item that is eagerly loaded (hydrated)',
            'https://api.example.com/collection',
            { includeItems: true },
            false,
            {
                'https://api.example.com/collection': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/collection' }],
                    'items': [{ 'id': 'https://api.example.com/item/1' }],
                },
                'https://api.example.com/item/1': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/item/1' }],
                },
            },
            Status.hydrated,
            1,
            Status.hydrated,
            2,
        ],

        // a collection with one item, which is not loaded
        [
            'A pre-loaded collection resource with one item that is not eagerly loaded (location only)',
            'https://api.example.com/collection',
            { includeItems: false },
            true,
            {
                'https://api.example.com/collection': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/collection' }],
                    'items': [{ 'id': 'https://api.example.com/item/1' }],
                },
                'https://api.example.com/item/1': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/item/1' }],
                },
            },
            Status.hydrated,
            1,
            Status.locationOnly,
            1,
        ],

        [
            'A pre-loaded collection with one item that is eagerly loaded (hydrated)',
            'https://api.example.com/collection',
            { includeItems: true },
            true,
            {
                'https://api.example.com/collection': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/collection' }],
                    'items': [{ 'id': 'https://api.example.com/item/1' }],
                },
                'https://api.example.com/item/1': {
                    'links': [{ 'rel': 'self', 'href': 'https://api.example.com/item/1' }],
                },
            },
            Status.hydrated,
            1,
            Status.hydrated,
            2,
        ],
    ])
    (
        '%s',
        /**
         * Test loading a collection.
         *
         * Load a collection involves  '1 + n' http GET operations.  The first '1' http GET is to get
         * the list of items in the collection; once this is completed the items can optionally
         * be loaded, or they can be left in a sparse state.
         *
         * Once the collection is loaded it can be reloaded (or simply loaded again). This test will
         * check that the reload of the items is performed when the items were not eagerly loaded.
         */
        async (
            title: string,
            uri: Uri,
            options: ApiOptions,
            preloadCollection: boolean,
            data: Record<Uri, LinkedRepresentation>,
            collectionState: Status,
            itemCount: number,
            itemState: Status,
            getCount: number) => {
            get.mockImplementation(async (resource, rel/*, options?: ApiOptions*/) => {
                const uri = LinkUtil.getUri(resource, rel);
                if (uri) {
                    if (uri in data) {
                        return {
                            data: data[uri],
                        };
                    }
                }
                throw new Error(`GET ${uri}: not found`);
            });
            const collection = SparseRepresentationFactory.make<CollectionRepresentation>(
                { ...options, uri, sparseType: 'collection' });

            if (preloadCollection) {
                await TrackedRepresentationFactory.load<CollectionRepresentation>(
                    collection, { ...options, includeItems: false });
            }

            const actual = await TrackedRepresentationFactory.load<CollectionRepresentation>(collection, options);
            assertThat(actual).isNot(null);
            assertThat(actual).isNot(undefined);
            assertThat(actual).is(match.predicate(instanceOfCollection));
            assertThat(actual).is(match.predicate(instanceOfTrackedRepresentation));
            if (instanceOfTrackedRepresentation(actual)) {
                assertThat(LinkUtil.getUri(actual, LinkRelation.Self)).is(uri);
                assertThat(TrackedRepresentationUtil.getState(actual).status).is(collectionState);
                assertThat(actual.items).isNot(null);
                assertThat(actual.items.length).is(itemCount);
                for (const item of actual.items) {
                    assertThat(item).is(match.predicate(instanceOfSingleton));
                    assertThat(item).is(match.predicate(instanceOfTrackedRepresentation));
                    assertThat(TrackedRepresentationUtil.getState(item as Tracked).status).is(itemState);
                }

                assertThat({
                    get: get.mock.calls.length,
                    post: post.mock.calls.length,
                    put: put.mock.calls.length,
                    del: del.mock.calls.length,
                }).is({ get: getCount, post: 0, put: 0, del: 0 });
            }
        });
});

