import { SparseRepresentationFactory } from '../../representation/sparseRepresentationFactory';
import { Status } from '../../representation/status';
import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { TrackedRepresentation } from '../../types/types';
import { assertThat } from 'mismatched';
import { HttpRequestOptions } from '../../interfaces/httpRequestOptions';
import { LinkRelation } from '../../linkRelation';
import { AxiosResponse } from 'axios';
import { syncResource } from '../../sync/syncResource';

describe('Synchroniser', () => {
    /**
     * These are very broad tests that work through the library stack but
     * don't make calls across the wire. The purpose is to check that the sync
     * code works through the correct loading, differencing and merging based
     * on updates, creates, no changes and deletes.
     *
     * These tests are also important because they check that the 'options'
     * are passed all the way through the stack (eg the factories). The options
     * in this case also allow us to avoid using mock interceptors.
     *
     * These tests are written reasonably verbosely so that you can reason
     * about the order of calls and the values of the payload.
     *
     * Note also, use the test console output to reason about the order of actions
     * including the output from the stubs each of which log output for reasoning.
     *
     * Below are the stubs across-the-wire calls stubs that we return result and
     * check for calls. Currently, we don't check call ordering/dependency.
     */


    /**
     * Helper to create a {@link LinkedRepresentation} with {@link State}
     */
    const makeHydratedResource = <T extends LinkedRepresentation>(document: T): TrackedRepresentation<T> =>
        // note: clone the document for multiple uses
        SparseRepresentationFactory.make({ on: { ...document } });

    const makeUnknownResource = <T extends LinkedRepresentation>(document: T): TrackedRepresentation<T> =>
        // note: clone the document for multiple uses
        SparseRepresentationFactory.make({ status: Status.unknown, on: { ...document } });

    const successPut: AxiosResponse = {
        data: undefined,
        headers: {},
        status: 204,
        statusText: '',
        config: {},
    };

    const get = jest.fn();
    const post = jest.fn();
    const put = jest.fn();
    const del = jest.fn();

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

    const options = {
        getFactory: get,
        postFactory: post,
        putFactory: put,
        deleteFactory: del,
    } as HttpRequestOptions;

    afterEach(() => {
        get.mockReset();
        post.mockReset();
        put.mockReset();
        del.mockReset();
    });

    describe('singleton (getResource)', () => {
        const resource = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/tenant/90a936d4a3',
                },
                {
                    rel: 'edit-form',
                    href: 'https://api.example.com/tenant/form/edit',
                },
            ],
            code: 'rewire.example.nz',
            name: 'Rewire NZ',
            description: 'A sample tenant (company/organisation)',
        };
        const editForm = {
            links: [
                {
                    rel: 'self',
                    href: 'https://api.example.com/tenant/form/edit',
                },
            ],
            items: [
                {
                    type: 'http://types/text',
                    name: 'code',
                    required: true,
                },
                {
                    type: 'http://types/text',
                    name: 'name',
                },
                {
                    type: 'http://types/text',
                    name: 'description',
                },
            ],
        };

        it('should not need updates when the same', async () => {
            get
                .mockResolvedValueOnce({ data: resource })
                .mockResolvedValueOnce({ data: editForm });

            /*
             * An unknown resource is loaded:
             *  - requires one call to hydrate
             *  - requires one call to load the edit form
             */
            const result = await syncResource(makeUnknownResource(resource), { ...resource }, [], options);
            expect(result).toBeDefined();
            verifyMocks(2, 0, 0, 0);
        });

        it('should make update when different attributes on the logically same resource', async () => {
            const document = {
                links: [
                    {
                        rel: 'self',
                        href: 'https://api.example.com/tenant/90a936d4a3',
                    },
                    {
                        rel: 'edit-form',
                        href: 'https://api.example.com/tenant/form/edit',
                    },
                ],
                code: 'rewire.example.nz (updated)',
                name: 'Rewire NZ (updated)',
                description: 'A sample tenant (company/organisation)',
            };

            get
                .mockResolvedValueOnce({ data: resource })
                .mockResolvedValueOnce({ data: editForm });

            put.mockResolvedValueOnce({ status: 204, data: undefined });

            // const sparseResource = SparseRepresentationFactory.make({ uri: 'https://api.example.com/tenant/90a936d4a3' });

            const result = await syncResource(makeUnknownResource(resource), document, [], options);

            expect(result).toBeDefined();
            // verifyMocks(1, 0, 0, 0);
            verifyMocks(2, 0, 1, 0);
        });
    });

    describe('item in a collection (getResourceInCollection)', () => {
        it('should sync a document into a collection', async () => {
            const document = {
                name: 'Rewire NZ (copy)',
                code: 'copy.rewire.example.nz',
                description: 'A sample tenant (company/organisation)',
            };
            const collection = {
                links: [
                    { rel: 'self', href: 'https://api.example.com/tenant' },
                    { rel: 'create-form', href: 'https://api.example.com/tenant/form/create' },
                ],
                items: [],
            };
            const createForm = {
                links: [
                    { rel: 'self', href: 'https://api.example.com/tenant/form/create' },
                    // { rel: 'submit', href: 'https://api.example.com/tenant' },
                ],
                items: [
                    { type: 'http://types/text', name: 'code', required: true },
                    { type: 'http://types/text', name: 'name' },
                    { type: 'http://types/text', name: 'description' },
                ],
            };
            const tenantXXXX = 'https://api.example.com/tenant/XXXX';

            get
                .mockResolvedValueOnce({ data: collection })
                .mockResolvedValueOnce({ data: createForm })
                .mockResolvedValueOnce({
                    data: {
                        links: [{ rel: LinkRelation.Self, href: tenantXXXX }],
                        ...document,
                    },
                });

            post.mockReturnValueOnce(
                {
                    data: undefined,
                    headers: { location: tenantXXXX },
                    status: 201,
                });

            const result = await syncResource(makeUnknownResource(collection), document, [], options);

            expect(result).toBeDefined();
            verifyMocks(3, 1, 0, 0);
        });
    });

    const parentUri = 'https://api.example.com/user/f58c6dd2a5';

    describe('named collection on a parent resource', () => {
        const todosCollectionUri = 'https://api.example.com/user/tenant/90a936d4a3/todo';
        const todo1Uri = 'https://api.example.com/todo/4bf1d09bb0';
        const todo2Uri = 'https://api.example.com/todo/a3e0ce2e0d';
        const todoEditFormUri = 'https://api.example.com/todo/form/edit';
        const todoCreateFormUri = 'https://api.example.com/todo/form/create';

        const parent = {
            links: [
                { rel: 'self', href: parentUri },
                { rel: 'todos', href: todosCollectionUri },
            ],
            name: 'test',
            email: 'test@rewire.nz',
        };
        const todosCollection = {
            links: [
                { rel: 'self', href: todosCollectionUri },
                { rel: 'create-form', href: todoCreateFormUri },
            ],
            items: [
                { id: todo1Uri, title: 'One Todo' },
                { id: todo2Uri, title: 'Two Todo (tag)' },
            ],
        };
        const todo1 = {
            links: [
                { rel: 'self', href: todo1Uri },
                { rel: 'edit-form', href: todoEditFormUri },
            ],
            name: 'One Todo',
            due: '0001-01-01T11:40:00+11:40',
        };
        const todo2 = {
            links: [
                { rel: 'self', href: todo2Uri },
                { rel: 'edit-form', href: todoEditFormUri },
            ],
            name: 'Two Todo (tag)',
            state: 'http://example.com/todo/state/complete',
            due: '0001-01-01T11:40:00+11:40',
        };

        const formItems = [
            {
                type: 'http://types/text',
                name: 'name',
                required: true,
                description: 'The title of the page',
            },
            {
                type: 'http://types/select',
                name: 'state',
                description: 'A todo can only toggle between open and complete.',
                items: [
                    {
                        type: 'http://types/enum',
                        value: 'http://example.com/todo/state/complete',
                        label: 'Completed',
                        name: 'completed',
                        description: 'The todo has been completed',
                    },
                    {
                        type: 'http://types/enum',
                        value: 'http://example.com/todo/state/open',
                        label: 'Open',
                        name: 'open',
                        description: 'The todo has been opened',
                    },
                ],
            },
            {
                type: 'http://types/datetime',
                name: 'due',
                description: 'The UTC date the todo is due',
            },
        ];
        const editForm = {
            links: [{ rel: 'self', href: todoEditFormUri }],
            items: formItems,
        };

        const createForm = {
            links: [{ rel: 'self', href: todoCreateFormUri }],
            items: formItems,
        };

        const fakeResponseFactory = <T extends LinkedRepresentation>(resource: T, rel: RelationshipType): Partial<AxiosResponse<T>> | never => {
            const uri = LinkUtil.getUri(resource, rel);

            /**
             * Wiring up the representations requires a good understanding of the network
             * of data structure.
             */
            function factory(uri: string): T {
                switch (uri) {
                    case parentUri:
                        return parent as unknown as T;
                    case todosCollectionUri:
                        return todosCollection as unknown as T;
                    case todo1Uri:
                        return todo1 as unknown as T;
                    case todo2Uri:
                        return todo2 as unknown as T;
                    case todoEditFormUri:
                        return editForm as unknown as T;
                    case todoCreateFormUri:
                        return createForm as unknown as T;
                    default:
                        throw new Error(`Fake not found: ${uri}`);
                }
            }

            if (uri) {
                return { data: factory(uri) };
            } else {
                throw new Error('Not found');
            }
        };
        describe('item in collection (getResourceInNamedCollection)', () => {
            it('should not update when the document (as an item) is the same as that in the list', async () => {
                const matchedItem = {
                    links: [
                        { rel: 'self', href: todo2Uri },
                        { rel: 'edit-form', href: todoEditFormUri },
                    ],
                    name: 'Two Todo (tag)',
                    state: 'http://example.com/todo/state/complete',
                    due: '0001-01-01T11:40:00+11:40',
                };
                const noChangeDocument = todo2;

                get
                    .mockResolvedValueOnce({ data: { ...todosCollection } })
                    .mockResolvedValueOnce({ data: { ...matchedItem } })
                    .mockResolvedValueOnce({ data: { ...editForm } });

                // put.mockResolvedValueOnce({ status: 200 });
                const result = await syncResource(makeHydratedResource(parent), noChangeDocument, [], {
                    ...options,
                    rel: 'todos',
                });

                expect(result).toBeDefined();
                verifyMocks(3, 0, 0, 0);
            });

            it('should update when the document matches an item and an attribute is different', async () => {
                const matchedItem = {
                    links: [
                        { rel: 'self', href: todo2Uri },
                        { rel: 'edit-form', href: todoEditFormUri },
                    ],
                    name: 'Two Todo (tag)',
                    state: 'http://example.com/todo/state/complete',
                    due: '0001-01-01T11:40:00+11:40',
                };
                const changedDocument = {
                    links: [
                        { rel: 'self', href: todo2Uri },
                        { rel: 'edit-form', href: todoEditFormUri },
                    ],
                    name: 'Two Todo (tag) [Updated]',
                    state: 'http://example.com/todo/state/complete',
                    due: '0001-01-01T11:40:00+11:40',
                };

                get
                    .mockResolvedValueOnce({ data: { ...todosCollection } })
                    .mockResolvedValueOnce({ data: { ...matchedItem } })
                    .mockResolvedValueOnce({ data: { ...editForm } });

                put.mockResolvedValue(successPut);

                const result = await syncResource(makeHydratedResource(parent), changedDocument, [], {
                    ...options,
                    rel: 'todos',
                });

                expect(result).toBeDefined();
                verifyMocks(3, 0, 1, 0);
            });

            it('should add when the document is not found in collection', async () => {
                const newDocument = {
                    name: 'Brand new',
                    state: 'http://example.com/todo/state/complete',
                    due: '0001-01-01T11:40:00+11:40',
                };

                get
                    .mockResolvedValueOnce({ data: { ...todosCollection } })
                    .mockResolvedValueOnce({ data: { ...createForm } });

                post.mockResolvedValueOnce(() => ({ headers: { location: 'https://api.example.com/todo/new' } }));

                const result = await syncResource(makeHydratedResource(parent), newDocument, [], {
                    ...options,
                    rel: 'todos',
                });

                expect(result).toBeDefined();
                verifyMocks(2, 1, 0, 0);

            });
        });

        describe('getCollectionInNamedCollection', () => {
            it('should not update when the collections (all items) are the same', async () => {
                const noChangeCollection = {
                    ...todosCollection,
                    items: [todo1, todo2],
                };

                get
                    .mockResolvedValueOnce({ data: { ...todosCollection } })
                    .mockResolvedValueOnce({ data: todo1 })
                    .mockResolvedValueOnce({ data: todo2 })
                    .mockResolvedValueOnce({ data: editForm });

                const result = await syncResource(makeHydratedResource(parent), noChangeCollection, [], {
                    ...options,
                    rel: 'todos',
                });

                expect(result).toBeDefined();
                verifyMocks(4, 0, 0, 0);

            });

            it('should update when the document matches an item and an attribute is different', async () => {

                const oneItemChangedInCollection = {
                    ...todosCollection,
                    items: [
                        todo1,
                        {
                            links: [
                                { rel: 'self', href: todo2Uri },
                                { rel: 'edit-form', href: todoEditFormUri },
                            ],
                            name: 'Two Todo (tag) [Updated]',
                            state: 'http://example.com/todo/state/complete',
                            due: '0001-01-01T11:40:00+11:40',
                        },
                    ],
                };

                get.mockImplementation(fakeResponseFactory);
                put.mockResolvedValueOnce({ status: 200 });

                const result = await syncResource(makeHydratedResource(parent), oneItemChangedInCollection, [], {
                    ...options,
                    rel: 'todos',
                });

                expect(result).toBeDefined();
                verifyMocks(5, 0, 1, 0);
            });

            it('should add when the document is not found in collection', async () => {
                const newItem = {
                    name: 'New One',
                    state: 'http://example.com/todo/state/open',
                    due: '0001-01-01T11:40:00+11:40',
                };

                const oneItemAddedInCollection = {
                    ...todosCollection,
                    items: [todo1, todo2, newItem],
                };

                get.mockImplementation(fakeResponseFactory);
                post.mockResolvedValueOnce({ headers: { location: 'https://api.example.com/todo/newOne934875' } });

                const result = await syncResource(makeHydratedResource(parent), oneItemAddedInCollection, [], {
                    ...options,
                    rel: 'todos',
                });

                expect(result).toBeDefined();
                verifyMocks(7, 1, 0, 0);
            });

            it('should delete when a document is not found in collection', async () => {
                const oneItemRemovedInCollection = {
                    ...todosCollection,
                    items: [todo1],
                };

                get
                    .mockResolvedValueOnce({ data: { ...todosCollection } })
                    .mockResolvedValueOnce({ data: todo1 })
                    .mockResolvedValueOnce({ data: editForm });

                del.mockResolvedValueOnce(() => ({}));


                const result = await syncResource(makeHydratedResource(parent), oneItemRemovedInCollection, [], {
                    ...options,
                    rel: 'todos',
                });

                expect(result).toBeDefined();
                verifyMocks(3, 0, 0, 1);
            });
        });

        describe('getSingleton', () => {
            const parent = {
                links: [
                    { rel: 'self', href: 'https://api.example.com/tenant/90a936d4a3' },
                    { rel: 'user', href: 'https://api.example.com/user/5' },
                    { rel: 'edit-form', href: 'https://api.example.com/tenant/form/edit' },
                ],
                code: 'rewire.example.nz',
                name: 'Rewire NZ',
                description: 'A sample tenant (company/organisation)',
            };
            const editForm = {
                links: [
                    { rel: 'self', href: 'https://api.example.com/user/form/edit' },
                ],
                items: [
                    {
                        type: 'http://types/text/email',
                        name: 'email',
                        required: true,
                        description: 'The email address of the user',
                    },
                    {
                        type: 'http://types/text',
                        name: 'name',
                        required: true,
                        description: 'The name of the user to be shown on the screen',
                    },
                    {
                        type: 'http://types/select',
                        multiple: true,
                        name: 'externalId',
                        description: 'The third-party id fo the user (eg \'auth0|xxxxx\')',
                        items: null,
                    },
                ],
            };

            const resource = {
                links: [
                    { rel: 'self', href: parentUri },
                    { rel: 'edit-form', href: 'https://api.example.com/user/form/edit' },
                ],
                email: 'test@rewire.example.nz',
                name: 'test',
            };

            it('should not update when attributes on singleton are same', async function() {
                const hydratedParent = makeHydratedResource(parent);

                const noChangeParent = {
                    ...parent,
                    user: resource,
                };

                get
                    .mockResolvedValueOnce({ data: resource })
                    .mockResolvedValueOnce({ data: editForm });


                const result = await syncResource(hydratedParent, noChangeParent, [], {
                    ...options,
                    rel: 'user',
                    relOnDocument: 'user',
                });
                expect(result).toBeDefined();
                verifyMocks(2, 0, 0, 0);
                assertThat(result).is(hydratedParent);
            });

            it('should update when attributes on singleton are different', async function() {
                const hydratedParent = makeHydratedResource(parent);

                const updatedUser = {
                    ...resource,
                    name: 'updated',
                };
                const changedSingletonOnParent = {
                    ...parent,
                    user: updatedUser,
                };
                get
                    .mockResolvedValueOnce({ data: resource })
                    .mockResolvedValueOnce({ data: editForm });

                put.mockResolvedValueOnce(() => ({}));


                const result = await syncResource(hydratedParent, changedSingletonOnParent, [], {
                    ...options,
                    rel: 'user',
                    relOnDocument: 'user',
                });
                expect(result).toBeDefined();
                verifyMocks(2, 0, 1, 0);
                assertThat(result).is(hydratedParent);
            });

            describe('strategies', () => {
                it('should ', async function() {
                    const hydratedParent = makeHydratedResource(parent);

                    const updatedUser = {
                        ...resource,
                        name: 'updated',
                    };
                    const changedSingletonOnParent = {
                        ...parent,
                        user: updatedUser,
                    };

                    get
                        .mockResolvedValueOnce({ data: resource })
                        .mockResolvedValueOnce({ data: editForm });

                    put.mockResolvedValueOnce({});

                    const strategy = jest.fn()
                        .mockImplementation(async ({ resource, document, options }) => {
                            expect(resource).toBeDefined();
                            expect(document).toBeDefined();
                            expect(options).toBeDefined();
                        });

                    const result = await syncResource(hydratedParent, changedSingletonOnParent, [opts => strategy({ ...opts })], {
                        ...options,
                        rel: 'user',
                        relOnDocument: 'user',
                    });

                    expect(result).toBeDefined();
                    verifyMocks(2, 0, 1, 0);
                    assertThat(result).is(hydratedParent);

                    expect(strategy).toHaveBeenCalled();
                });
            });
        });
    });
});
