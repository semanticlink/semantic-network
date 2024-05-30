import { CollectionRepresentation, Uri } from 'semantic-link';
import { CollectionMerger } from '../representation/collectionMerger';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';

/**
 * Increasing counter to create new & unique resource names
 * @type {number}
 */
let repCount = 1;

/**
 * Return an url based on the incremented counter to make href unique
 */
const uniqueUri = (id: string | number | undefined = undefined): Uri => `http://example.com/${id || ++repCount}`;

const makeItems = (items: number[]) => items.map(x => uniqueUri(x));

function makeCollection(items: number[]) {
    return SparseRepresentationFactory.make({
        uri: uniqueUri(10),
        sparseType: 'collection',
        defaultItems: makeItems(items),
    }) as CollectionRepresentation;
}

describe('Collection Merger', () => {

    test.each(
        [
            ['omit', CollectionMerger.omitItems],
            ['extract', CollectionMerger.extractItems],
        ])('%s, undefined items does not throw', (title, callback) => {
        callback({} as unknown as CollectionRepresentation, {} as unknown as CollectionRepresentation);
    });

    test.each(
        [
            [[], [], []],
            [[], [1], []],
            [[], [1, 2], []],
            [[1], [], []],
            [[1, 2], [], []],
            [[1], [1], [1]],
            [[1], [1, 2], [1]],
            [[1, 2], [1], [1]],
            [[1, 2], [1, 2], [1, 2]],
            [[1, 2], [1, 2, 3], [1, 2]],
            [[1, 2, 3], [1], [1]],
            [[1, 2, 3], [1, 2], [1, 2]],
            [[1, 2, 3], [1, 4], [1]],
        ])('omit items, %#', (lVal, rVal, expectedVal) => {
        const actual = CollectionMerger.omitItems(makeCollection(lVal), makeCollection(rVal));
        const expected = makeCollection(expectedVal);
        expect(actual.items).toEqual(expected.items);
    });

    test.each(
        [
            [[], [], []],
            [[], [1], [1]],
            [[], [1, 2], [1, 2]],
            [[1], [], [1]],
            [[1, 2], [], [1, 2]],
            [[1], [1], [1]],
            [[1], [1, 2], [1, 2]],
            [[1, 2], [1], [1, 2]],
            [[1, 2], [1, 2], [1, 2]],
            [[1, 2], [1, 2, 3], [1, 2, 3]],

        ])('pick items, %#', (lVal, rVal, expectedVal) => {
        const lvalue = makeCollection(lVal);
        const rvalue = makeCollection(rVal);
        const actual = CollectionMerger.extractItems(lvalue, rvalue);
        const expected = makeCollection(expectedVal);
        expect(actual.items).toEqual(expected.items);
    });

    test.each(
        [
            // none to be removed
            [[], [], []],
            [[], [1], [1]],
            [[], [1, 2], [1, 2]],
            [[1], [], []],
            [[1, 2], [], []],
            [[1], [1], [1]],
            [[1], [1, 2], [1, 2]],
            [[1, 2], [1], [1]],
            [[1, 2], [1, 2], [1, 2]],
            [[1, 2], [1, 2, 3], [1, 2, 3]],
            // some to be removed
            [[1, 2], [], []],
            [[1, 2], [1], [1]],
            [[1, 2, 3], [2, 3], [2, 3]],
            // added and removed
            [[1, 2], [2, 3], [2, 3]],

        ])('merge, items %#', (lVal, rVal, expectedVal) => {
        const actual = CollectionMerger.merge(makeCollection(lVal), makeCollection(rVal));
        const expected = makeCollection(expectedVal);
        expect(actual.items).toEqual(expected.items);
    });

    test.each(
        [
            [
                { defaultItems: [{ id: '1', title: 'x' }] },
                { defaultItems: [{ id: '1', title: 'x' }] },
                { defaultItems: [{ id: '1', title: 'x' }] },
            ],
            [
                { defaultItems: [{ id: '1', title: 'x' }] },
                { defaultItems: [{ id: '1', title: 'y' }] },
                { defaultItems: [{ id: '1', title: 'y' }] },
            ],
            [
                { defaultItems: [{ id: '1', title: 'x', eTag: '34vg' }] },
                { defaultItems: [{ id: '1', title: 'x', eTag: '34vg' }] },
                { defaultItems: [{ id: '1', title: 'x', eTag: '34vg' }] }],
            [
                { defaultItems: [{ id: '1', title: 'x', eTag: '34vg' }] },
                { defaultItems: [{ id: '1', title: 'y', eTag: '34vg' }] },
                { defaultItems: [{ id: '1', title: 'y', eTag: '34vg' }] },
            ],
            [
                { defaultItems: [{ id: '1', title: 'x', eTag: '34vg' }] },
                {},
                { defaultItems: [{ id: '1', title: 'x', eTag: '34vg' }] },
            ],
            [
                {},
                { defaultItems: [{ id: '1', title: 'x', eTag: '34vg' }] },
                {},
            ],


        ])('update items, %#', (lVal: ResourceFactoryOptions, options: ResourceFactoryOptions, expectedVal) => {

        function makeCollection(options: ResourceFactoryOptions) {
            return SparseRepresentationFactory.make<CollectionRepresentation>({
                uri: uniqueUri(10),
                sparseType: 'collection',
                ...options,
            });
        }

        const lvalue = makeCollection(lVal);
        const rvalue = makeCollection(options);

        const actual = CollectionMerger.updateItems(lvalue, rvalue);
        const expected = makeCollection(expectedVal);
        expect(actual.items).toEqual(expected.items);
    });
});
