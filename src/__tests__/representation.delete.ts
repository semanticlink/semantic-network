import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { TrackedRepresentationFactory } from '../representation/trackedRepresentationFactory';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { del } from '../representation/delete';
import { ResourceDeleteOptions } from '../interfaces/resourceDeleteOptions';
import { RepresentationUtil } from '../utils/representationUtil';

jest.mock('../representation/trackedRepresentationFactory');
const trackedRepresentationFactory = TrackedRepresentationFactory as jest.Mocked<typeof TrackedRepresentationFactory>;

describe('resource, delete', () => {

    const href = 'https://api.example.com';

    test.each([
        [
            'singleton (default path)',
            { uri: href, sparseType: 'singleton' } as ResourceFactoryOptions,
            trackedRepresentationFactory.del,
            1,
            0,
        ],
        [
            'collection (default path)',
            { uri: href, sparseType: 'collection' } as ResourceFactoryOptions,
            trackedRepresentationFactory.del,
            1,
            0,
        ],
        [
            'where collection, no items',
            {
                uri: href,
                sparseType: 'collection',
                where: SparseRepresentationFactory.make({ uri: '1' }),
            } as ResourceFactoryOptions,
            trackedRepresentationFactory.del,
            1,
            0,
        ],
        [
            'where collection, one item',
            {
                uri: href,
                sparseType: 'collection',
                defaultItems: ['1'],
                where: SparseRepresentationFactory.make({ uri: '1' }),
            } as ResourceFactoryOptions,
            trackedRepresentationFactory.del,
            1,
            1,
        ],
        [
            'where collection, two items',
            {
                uri: href,
                sparseType: 'collection',
                defaultItems: ['1', '2'],
                where: SparseRepresentationFactory.make({ uri: '1' }),
            } as ResourceFactoryOptions,
            trackedRepresentationFactory.del,
            1,
            1,
        ],
    ])('%s', async (title: string, options: ResourceFactoryOptions, factory: any, calledTimes: number, whereItemsCalledTimes: number) => {

        const findInCollectionMock = jest.spyOn(RepresentationUtil, 'findInCollection');
        // Implementation always returns non-undefined result to trigger loading an item
        findInCollectionMock.mockImplementation(() => ({ links: [] }));

        const resource = SparseRepresentationFactory.make(options);
        trackedRepresentationFactory.load.mockResolvedValue(resource);

        await del(resource, options);
        expect(factory).toBeCalledTimes(calledTimes);
        // note: could make asserts on what the factory was called with

        if (whereItemsCalledTimes > 0) {
            expect(findInCollectionMock).toHaveBeenCalledTimes(whereItemsCalledTimes);
        }

        findInCollectionMock.mockRestore();
    });

    test.each([
        [
            'singleton (default path)',
            {
                uri: href,
                sparseType: 'singleton',
                reloadOnDelete: true,
            } as ResourceFactoryOptions & ResourceDeleteOptions,
            1,
        ],
    ])('reload options, %s', async (title: string, options: ResourceFactoryOptions & ResourceDeleteOptions, calledTimesDel: number) => {


        const resource = SparseRepresentationFactory.make(options);
        trackedRepresentationFactory.load.mockResolvedValue(resource);
        trackedRepresentationFactory.del.mockResolvedValue(resource);

        await del(resource, options);

        expect(trackedRepresentationFactory.load).toBeCalled();
        expect(trackedRepresentationFactory.del).toBeCalledTimes(calledTimesDel);

    });
});


