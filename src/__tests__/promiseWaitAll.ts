import { parallelWaitAll, sequentialWaitAll } from '../utils/promiseWaitAll';
import { SparseRepresentationFactory } from '../representation/sparseRepresentationFactory';
import { CollectionRepresentation } from 'semantic-link';

describe('Async wait all collection mixins', () => {

    test.each([
        [sequentialWaitAll, ['//uri/1', '//uri/2'], [100, 0], ['//uri/1', '//uri/2']],
        [sequentialWaitAll, ['//uri/1', '//uri/2'], [0, 0], ['//uri/1', '//uri/2']],
        [sequentialWaitAll, ['//uri/1', '//uri/2'], [0, 100], ['//uri/1', '//uri/2']],
        [parallelWaitAll, ['//uri/1', '//uri/2'], [0, 0], ['//uri/1', '//uri/2']],
        [parallelWaitAll, ['//uri/1', '//uri/2'], [100, 0], ['//uri/2', '//uri/1']],
        [parallelWaitAll, ['//uri/1', '//uri/2'], [0, 100], ['//uri/1', '//uri/2']],
    ])('call order %p %#', async (promiseWaitAll, items, wait, order) => {

        const myMock = jest.fn();

        await promiseWaitAll(
            SparseRepresentationFactory.make({ sparseType: 'collection', defaultItems: items }) as CollectionRepresentation,
            async i => {
                // change order of completion based on timeouts to simulate network call responses
                await new Promise(r => setTimeout(() => {
                    myMock(i.links[0].href);
                    r(undefined);
                }, wait.shift()));
            }
        );
        expect(myMock.mock.calls.length).toBe(order.length);
        order.forEach((value, index) => {
            expect(myMock.mock.calls[index][0]).toBe(value);
        });

    });


});
