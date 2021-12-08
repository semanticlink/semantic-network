import { assertThat } from 'mismatched';
import { instanceOfSingleton } from '../utils/instanceOf/instanceOfSingleton';

describe('instance of collection', () => {

    test.each([
        ['nothing', undefined, false],
        ['empty', null, false],
        ['empty', {}, false],
        ['linked representation', { links: [], }, true],
        ['collection, no match', { links: [], items: [] }, false],
        ['instance of form, edit', { links: [], items: [{ type: 'text' }] }, false],
    ])('%s', (title: string, obj: any, expected: boolean) => {
        assertThat(instanceOfSingleton(obj)).is(expected);
    });
});
