import { PooledResourceUtil } from '../../sync/pooledResourceUtil';
import { assertThat } from 'mismatched';
import { ApiUtil } from '../../apiUtil';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';
import { noopResolver } from '../../representation/resourceMergeFactory';


describe('Pooled collection', () => {
    const document = {
        links: [{ rel: 'self', href: 'http://api.example.com/role/1' }],
        name: 'Admin',
    };

    const pooledCollection = {
        links: [{ rel: 'self', href: 'http://api.example.com/role/' }],
        items: [document],
    };

    const parentCollection = {
        links: [
            { rel: 'self', href: 'http://api.example.com/collection/' },
            { rel: 'roles', href: 'http://api.example.com/role/' },
        ],
        roles: pooledCollection,
    };

    const spy = jest.spyOn(ApiUtil, 'get').mockResolvedValue(pooledCollection);
    // sinon.stub(cache, 'getNamedCollection').callsFake(() => Promise.resolve(pooledCollection));

    describe('strategy one & two: it is simply found map it based on Self and/or mappedTitle', () => {
        const resource = {
            links: [
                {
                    rel: 'self',
                    href: 'http://api.example.com/role/2',
                },
            ],
            name: 'Admin',
        };

        it('returns document based on uri/name matching', async () => {
            const result = await PooledResourceUtil.get(parentCollection, 'roles', /roles/, resource);
            assertThat(result).is(document);
            expect(spy).toHaveBeenCalled();
        });

        it('add uris to the resolution map when existing resource', async () => {

            const mock = jest.fn();
            const options = {
                resolver: {
                    add: (documentUriResolved, nodUriResolved) => {
                        mock(documentUriResolved, nodUriResolved);
                        assertThat(documentUriResolved).is('http://api.example.com/role/2');
                        assertThat(nodUriResolved).is('http://api.example.com/role/1');
                    },
                },
            } as PooledCollectionOptions;
            await PooledResourceUtil.get(parentCollection, 'roles', /roles/, resource, options);

            expect(mock).toHaveBeenCalled();
        });
    });

    describe('strategy three: check to see if Self is an actual resource anyway and map it if it is, otherwise make', () => {
        const resource = {
            links: [
                {
                    rel: 'self',
                    href: 'http://api.example.com/role/2',
                },
            ],
            name: 'NewRole',
        };

        it('should find Self, resolve uri and then return resource', async () => {
            const options = {
                resolver: {
                    resolve: resolving => {
                        assertThat(resolving).is('http://api.example.com/role/2');
                        // we just say here that we've already got it - so return this from the known collection
                        return 'http://api.example.com/role/1';
                    },
                },
            } as PooledCollectionOptions;
            const result = await PooledResourceUtil.get(parentCollection, 'roles', /roles/, resource, options);
            assertThat(result).is(document);

        });

        it('should find Self and then make resource with add mapping', async () => {
            const mock = jest.fn();
            const options = {
                resolver: {
                    ...noopResolver,
                    add: (documentUri, nodUri) => {
                        mock();
                        assertThat(documentUri).is('http://api.example.com/role/2');
                        assertThat(nodUri).is('http://api.example.com/role/3');
                    },
                },
            } as PooledCollectionOptions;

            const createdResource = {
                links: [{ rel: 'self', href: 'http://api.example.com/role/3' }],
                name: 'NewRole',
            };

            // sinon.stub(cache, 'createCollectionItem').callsFake(() => Promise.resolve(createdResource));
            const spy = jest.spyOn(ApiUtil, 'create').mockResolvedValue(createdResource);
            const result = await PooledResourceUtil.get(parentCollection, 'roles', /roles/, resource, options);

            assertThat(result).is(createdResource);
            expect(mock).toHaveBeenCalled();
            spy.mockReset();
        });
    });

    describe('strategy four: make if we can because we at least might have the attributes', () => {
        it('should make resource', async () => {
            const resource = {
                links: [{
                    rel: 'self',
                    href: '',
                }],
                name: 'UtterlyNewRole',
            };

            let addResolverCalled = false;

            const options = {
                resolver: {
                    ...noopResolver,
                    add: () => {
                        addResolverCalled = true;
                    },
                },
            } as PooledCollectionOptions;

            const createdResource = {
                links: [
                    {
                        rel: 'self',
                        href: 'http://api.example.com/role/3',
                    },
                ],
                name: 'UtterlyNewRole',
            };

            const spy = jest.spyOn(ApiUtil, 'get').mockResolvedValue(createdResource);

            const result = await PooledResourceUtil.get(parentCollection, 'roles', /roles/, resource, options);

            if (result) {
                assertThat(result).is(createdResource);
                expect(addResolverCalled).not.toHaveBeenCalled();
            }

            spy.mockReset();


        });
    });
});
