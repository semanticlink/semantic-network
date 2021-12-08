import { assertThat } from 'mismatched';
import { LinkRelation } from '../linkRelation';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';

describe('instance of collection', () => {

    test.each([
        ['nothing', {}, false],
        ['linked representation', { links: [], }, false],
        ['forms item (matches type but no href with form), no match', {
            links: [],
            items: [{  type: 'text' }]
        }, true],
        ['empty', { links: [], items: [] }, true],
        ['instance of form, edit', {
            links: [{ rel: LinkRelation.Self, href: 'edit-form' }],
            items: [{ type: 'text' }],
        }, false],
        ['forms item (matches type but no href with form at links level - nonsense data), no match', {
            links: [],
            items: [{ links: [{ rel: LinkRelation.Self, href: 'https://api.example.com/create-form' }], type: 'text' }]
        }, true],
        ['form link, items', { links: [{ rel: LinkRelation.Self, href: 'collection' }], items: [] }, true],
        ['requires link and valid item', {
            links: [{ rel: LinkRelation.Self, href: 'create-form' }],
            items: [{ links: [] }],
        }, true],
    ])('%s', (title: string, obj: any, expected: boolean) => {
        assertThat(instanceOfCollection(obj)).is(expected);
    });


});
